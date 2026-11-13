import { Request, Response } from 'express';
import { getDb } from '../database/index.js';
import { formatProductRow, PRODUCT_SELECT } from '../utils/products.js';

export async function getFavorites(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const userId = req.user!.id;

    const rows = db.queryAll(
      `${PRODUCT_SELECT}
       JOIN favorites f ON f.productId = p.id
       WHERE f.userId = ?
       ORDER BY f.createdAt DESC`,
      [userId],
    );
    res.json(rows.map(formatProductRow));
  } catch (error) {
    console.error('Erreur getFavorites:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des favoris' });
  }
}

export async function getFavoriteIds(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const rows = db.queryAll<{ productId: string }>(
      'SELECT productId FROM favorites WHERE userId = ?',
      [req.user!.id],
    );
    res.json(rows.map((row) => row.productId));
  } catch (error) {
    console.error('Erreur getFavoriteIds:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des favoris' });
  }
}

export async function addFavorite(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const userId = req.user!.id;
    const productId = req.params.productId || req.body.productId;

    if (!productId) {
      res.status(400).json({ error: 'productId est obligatoire' });
      return;
    }

    const product = db.queryOne('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }

    db.execute(
      'INSERT OR IGNORE INTO favorites (userId, productId, createdAt) VALUES (?, ?, ?)',
      [userId, productId, Date.now()],
    );
    res.status(201).json({ productId, isFavorite: true });
  } catch (error) {
    console.error('Erreur addFavorite:', error);
    res.status(500).json({ error: 'Erreur lors de l’ajout aux favoris' });
  }
}

export async function removeFavorite(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const productId = req.params.productId;
    db.execute('DELETE FROM favorites WHERE userId = ? AND productId = ?', [
      req.user!.id,
      productId,
    ]);
    res.json({ productId, isFavorite: false });
  } catch (error) {
    console.error('Erreur removeFavorite:', error);
    res.status(500).json({ error: 'Erreur lors du retrait des favoris' });
  }
}

export async function toggleFavorite(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const userId = req.user!.id;
    const productId = req.params.productId || req.body.productId;

    if (!productId) {
      res.status(400).json({ error: 'productId est obligatoire' });
      return;
    }

    const existing = db.queryOne('SELECT productId FROM favorites WHERE userId = ? AND productId = ?', [
      userId,
      productId,
    ]);

    if (existing) {
      db.execute('DELETE FROM favorites WHERE userId = ? AND productId = ?', [userId, productId]);
      res.json({ productId, isFavorite: false });
      return;
    }

    db.execute(
      'INSERT OR IGNORE INTO favorites (userId, productId, createdAt) VALUES (?, ?, ?)',
      [userId, productId, Date.now()],
    );
    res.json({ productId, isFavorite: true });
  } catch (error) {
    console.error('Erreur toggleFavorite:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des favoris' });
  }
}
