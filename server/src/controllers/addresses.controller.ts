import { Request, Response } from 'express';
import { getDb } from '../database/index.js';
import type { Address } from '../types/index.js';

function formatAddress(row: any): Address {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label ?? undefined,
    fullName: row.fullName,
    phone: row.phone ?? undefined,
    line1: row.line1,
    line2: row.line2 || undefined,
    city: row.city,
    postalCode: row.postalCode,
    country: row.country,
    isDefault: Boolean(row.isDefault),
    createdAt: Number(row.createdAt),
  };
}

function requireFields(body: any): string | null {
  if (!body.fullName || !body.line1 || !body.city || !body.postalCode) {
    return 'Nom complet, adresse, ville et code postal sont obligatoires.';
  }
  return null;
}

export async function getAddresses(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const rows = db.queryAll(
      'SELECT * FROM addresses WHERE userId = ? ORDER BY isDefault DESC, createdAt DESC',
      [req.user!.id],
    );
    res.json(rows.map(formatAddress));
  } catch (error) {
    console.error('Erreur getAddresses:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des adresses' });
  }
}

export async function createAddress(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const userId = req.user!.id;
    const missing = requireFields(req.body);
    if (missing) {
      res.status(400).json({ error: missing });
      return;
    }

    const { label, fullName, phone, line1, line2, city, postalCode, country, isDefault } = req.body;
    const id = `addr-${Date.now()}`;
    const createdAt = Date.now();
    const wantsDefault =
      Boolean(isDefault) ||
      !db.queryOne('SELECT id FROM addresses WHERE userId = ? LIMIT 1', [userId]);

    db.transaction(() => {
      if (wantsDefault) {
        db.execute('UPDATE addresses SET isDefault = 0 WHERE userId = ?', [userId]);
      }
      db.execute(
        `INSERT INTO addresses (
          id, userId, label, fullName, phone, line1, line2, city, postalCode, country, isDefault, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          label ? String(label) : null,
          String(fullName).trim(),
          phone ? String(phone) : null,
          String(line1).trim(),
          line2 ? String(line2) : null,
          String(city).trim(),
          String(postalCode).trim(),
          country ? String(country) : 'France',
          wantsDefault ? 1 : 0,
          createdAt,
        ],
      );
    });

    res.status(201).json(formatAddress(db.queryOne('SELECT * FROM addresses WHERE id = ?', [id])));
  } catch (error) {
    console.error('Erreur createAddress:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l’adresse' });
  }
}

export async function updateAddress(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const userId = req.user!.id;
    const { id } = req.params;
    const existing = db.queryOne<any>('SELECT * FROM addresses WHERE id = ? AND userId = ?', [
      id,
      userId,
    ]);

    if (!existing) {
      res.status(404).json({ error: 'Adresse introuvable' });
      return;
    }

    const fields: [string, unknown][] = [];
    const allowed = ['label', 'fullName', 'phone', 'line1', 'line2', 'city', 'postalCode', 'country'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        fields.push([field, req.body[field] === '' ? null : req.body[field]]);
      }
    }

    const isDefault = req.body.isDefault;
    db.transaction(() => {
      if (fields.length > 0) {
        db.execute(
          `UPDATE addresses SET ${fields.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`,
          [...fields.map(([, value]) => value), id],
        );
      }
      if (isDefault !== undefined) {
        if (isDefault) {
          db.execute('UPDATE addresses SET isDefault = 0 WHERE userId = ?', [userId]);
          db.execute('UPDATE addresses SET isDefault = 1 WHERE id = ?', [id]);
        } else {
          db.execute('UPDATE addresses SET isDefault = 0 WHERE id = ?', [id]);
        }
      }
    });

    res.json(formatAddress(db.queryOne('SELECT * FROM addresses WHERE id = ?', [id])));
  } catch (error) {
    console.error('Erreur updateAddress:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l’adresse' });
  }
}

export async function deleteAddress(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = db.queryOne<any>('SELECT * FROM addresses WHERE id = ? AND userId = ?', [
      id,
      userId,
    ]);
    if (!existing) {
      res.status(404).json({ error: 'Adresse introuvable' });
      return;
    }

    db.execute('DELETE FROM addresses WHERE id = ?', [id]);

    if (existing.isDefault) {
      const next = db.queryOne<{ id: string }>(
        'SELECT id FROM addresses WHERE userId = ? ORDER BY createdAt DESC LIMIT 1',
        [userId],
      );
      if (next) db.execute('UPDATE addresses SET isDefault = 1 WHERE id = ?', [next.id]);
    }

    res.json({ message: 'Adresse supprimée', id });
  } catch (error) {
    console.error('Erreur deleteAddress:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l’adresse' });
  }
}
