import { Request, Response } from 'express';
import { getDb } from '../database/index.js';
import { PricingError, priceOrder } from '../services/pricing.js';
import type { Coupon } from '../types/index.js';

function formatCoupon(row: any): Coupon {
  return {
    id: row.id,
    sellerId: row.sellerId,
    code: row.code,
    type: (row.type as Coupon['type']) ?? 'percent',
    value: Number(row.value),
    minSubtotal: Number(row.minSubtotal),
    maxUses: Number(row.maxUses),
    usedCount: Number(row.usedCount),
    startsAt: row.startsAt ? Number(row.startsAt) : undefined,
    endsAt: row.endsAt ? Number(row.endsAt) : undefined,
    isActive: Boolean(row.isActive),
    createdAt: Number(row.createdAt),
  };
}

function parseType(value: unknown): Coupon['type'] | null {
  return value === 'percent' || value === 'fixed' ? value : null;
}

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export async function getCoupons(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const rows = db.queryAll('SELECT * FROM coupons WHERE sellerId = ? ORDER BY createdAt DESC', [
      req.seller!.id,
    ]);
    res.json(rows.map(formatCoupon));
  } catch (error) {
    console.error('Erreur getCoupons:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des codes promo' });
  }
}

export async function createCoupon(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const seller = req.seller!;
    const { code, type, value, minSubtotal, maxUses, startsAt, endsAt, isActive } = req.body;

    if (!code || !String(code).trim()) {
      res.status(400).json({ error: 'Le code promo est obligatoire.' });
      return;
    }

    const cleanType = parseType(type ?? 'percent');
    if (!cleanType) {
      res.status(400).json({ error: 'Type invalide : « percent » ou « fixed ».' });
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      res.status(400).json({ error: 'La valeur de la remise doit être supérieure à zéro.' });
      return;
    }
    if (cleanType === 'percent' && numericValue > 100) {
      res.status(400).json({ error: 'Une remise en pourcentage ne peut pas dépasser 100 %.' });
      return;
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = db.queryOne('SELECT id FROM coupons WHERE UPPER(code) = ?', [cleanCode]);
    if (existing) {
      res.status(409).json({ error: 'Ce code promo existe déjà.' });
      return;
    }

    const id = `coupon-${Date.now()}`;
    const createdAt = Date.now();
    db.execute(
      `INSERT INTO coupons (
        id, sellerId, code, type, value, minSubtotal, maxUses, usedCount,
        startsAt, endsAt, isActive, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [
        id,
        seller.id,
        cleanCode,
        cleanType,
        numericValue,
        parseOptionalNumber(minSubtotal) ?? 0,
        parseOptionalNumber(maxUses) ?? 0,
        parseOptionalNumber(startsAt) ?? null,
        parseOptionalNumber(endsAt) ?? null,
        isActive === false ? 0 : 1,
        createdAt,
      ],
    );

    res.status(201).json(formatCoupon(db.queryOne('SELECT * FROM coupons WHERE id = ?', [id])));
  } catch (error) {
    console.error('Erreur createCoupon:', error);
    res.status(500).json({ error: 'Erreur lors de la création du code promo' });
  }
}

export async function updateCoupon(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const seller = req.seller!;
    const { id } = req.params;
    const existing = db.queryOne<any>('SELECT * FROM coupons WHERE id = ? AND sellerId = ?', [
      id,
      seller.id,
    ]);

    if (!existing) {
      res.status(404).json({ error: 'Code promo introuvable.' });
      return;
    }

    const fields: [string, unknown][] = [];

    if (req.body.code !== undefined) {
      const cleanCode = String(req.body.code).trim().toUpperCase();
      if (!cleanCode) {
        res.status(400).json({ error: 'Le code promo ne peut pas être vide.' });
        return;
      }
      const duplicate = db.queryOne(
        'SELECT id FROM coupons WHERE UPPER(code) = ? AND id <> ?',
        [cleanCode, id],
      );
      if (duplicate) {
        res.status(409).json({ error: 'Ce code promo existe déjà.' });
        return;
      }
      fields.push(['code', cleanCode]);
    }

    if (req.body.type !== undefined) {
      const cleanType = parseType(req.body.type);
      if (!cleanType) {
        res.status(400).json({ error: 'Type invalide : « percent » ou « fixed ».' });
        return;
      }
      fields.push(['type', cleanType]);
    }

    if (req.body.value !== undefined) {
      const numericValue = Number(req.body.value);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        res.status(400).json({ error: 'Valeur de remise invalide.' });
        return;
      }
      fields.push(['value', numericValue]);
    }

    const optionalFields: [string, string][] = [
      ['minSubtotal', 'minSubtotal'],
      ['maxUses', 'maxUses'],
      ['startsAt', 'startsAt'],
      ['endsAt', 'endsAt'],
    ];
    for (const [bodyKey, column] of optionalFields) {
      if (req.body[bodyKey] !== undefined) {
        fields.push([column, parseOptionalNumber(req.body[bodyKey]) ?? null]);
      }
    }

    if (req.body.isActive !== undefined) {
      fields.push(['isActive', req.body.isActive ? 1 : 0]);
    }

    if (fields.length > 0) {
      db.execute(
        `UPDATE coupons SET ${fields.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`,
        [...fields.map(([, value]) => value), id],
      );
    }

    res.json(formatCoupon(db.queryOne('SELECT * FROM coupons WHERE id = ?', [id])));
  } catch (error) {
    console.error('Erreur updateCoupon:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du code promo' });
  }
}

export async function deleteCoupon(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const seller = req.seller!;
    const { id } = req.params;
    const existing = db.queryOne('SELECT id FROM coupons WHERE id = ? AND sellerId = ?', [
      id,
      seller.id,
    ]);

    if (!existing) {
      res.status(404).json({ error: 'Code promo introuvable.' });
      return;
    }

    db.execute('DELETE FROM coupons WHERE id = ?', [id]);
    res.json({ message: 'Code promo supprimé', id });
  } catch (error) {
    console.error('Erreur deleteCoupon:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du code promo' });
  }
}

/** Prévisualise l'application d'un code promo sans créer de commande. */
export async function validateCoupon(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const { items, couponCode, shippingCost } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Le panier est vide.' });
      return;
    }

    const pricing = priceOrder(db, items, {
      shippingCost: Number(shippingCost ?? 0),
      couponCode: typeof couponCode === 'string' ? couponCode : undefined,
    });

    res.json({
      coupon: pricing.coupon ? formatCoupon(pricing.coupon) : null,
      subtotal: pricing.subtotal,
      discountTotal: pricing.discountTotal,
      shippingCost: pricing.shippingCost,
      total: pricing.total,
      sellerOrders: pricing.sellerOrders.map((group) => ({
        sellerId: group.sellerId,
        seller: group.seller,
        subtotal: group.subtotal,
        discount: group.discount,
        shippingShare: group.shippingShare,
        total: group.total,
      })),
    });
  } catch (error) {
    if (error instanceof PricingError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('Erreur validateCoupon:', error);
    res.status(500).json({ error: 'Erreur lors de la validation du code promo' });
  }
}
