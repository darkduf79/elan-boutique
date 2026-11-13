import { Request, Response } from 'express';
import { getDb } from '../database/index.js';
import { computeSellerPublic, formatSellerRow } from '../utils/seller.js';
import { formatProductRow, PRODUCT_SELECT } from '../utils/products.js';

export async function getSellers(_req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const rows = db.queryAll<any>(
      "SELECT * FROM sellers WHERE status = 'active' ORDER BY isPro DESC, createdAt ASC",
    );
    const sellers = rows.map((row) => computeSellerPublic(db, formatSellerRow(row)));
    res.json(sellers);
  } catch (error) {
    console.error('Erreur getSellers:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des boutiques' });
  }
}

export async function getSellerById(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const { id } = req.params;
    const row =
      db.queryOne('SELECT * FROM sellers WHERE id = ?', [id]) ??
      db.queryOne('SELECT * FROM sellers WHERE slug = ?', [id]);

    if (!row) {
      res.status(404).json({ error: 'Boutique introuvable' });
      return;
    }

    const seller = formatSellerRow(row);
    if (seller.status !== 'active') {
      res.status(404).json({ error: 'Boutique indisponible' });
      return;
    }

    res.json(computeSellerPublic(db, seller));
  } catch (error) {
    console.error('Erreur getSellerById:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la boutique' });
  }
}

export async function getSellerProducts(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { q, category, sort, inStock } = req.query;

    const sellerRow =
      db.queryOne<any>('SELECT * FROM sellers WHERE id = ?', [id]) ??
      db.queryOne<any>('SELECT * FROM sellers WHERE slug = ?', [id]);

    if (!sellerRow) {
      res.status(404).json({ error: 'Boutique introuvable' });
      return;
    }

    let query = `${PRODUCT_SELECT} WHERE p.sellerId = ? AND p.isOnline = 1`;
    const params: any[] = [sellerRow.id];

    if (q && typeof q === 'string') {
      const search = `%${q.trim()}%`;
      query += ' AND (p.title LIKE ? OR p.brand LIKE ? OR p.category LIKE ? OR p.description LIKE ?)';
      params.push(search, search, search, search);
    }

    if (category && typeof category === 'string' && category !== 'Tout') {
      query += ' AND p.category = ?';
      params.push(category);
    }

    if (inStock === 'true') {
      query += ' AND p.stock > 0';
    }

    switch (sort) {
      case 'prix-asc':
        query += ' ORDER BY p.price ASC';
        break;
      case 'prix-desc':
        query += ' ORDER BY p.price DESC';
        break;
      case 'notes':
        query += ' ORDER BY p.rating DESC, p.reviewCount DESC';
        break;
      default:
        query += ' ORDER BY p.createdAt DESC';
        break;
    }

    const rows = db.queryAll(query, params);
    res.json(rows.map(formatProductRow));
  } catch (error) {
    console.error('Erreur getSellerProducts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des produits de la boutique' });
  }
}
