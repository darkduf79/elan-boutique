import { Request, Response } from 'express';
import { getDb, type DatabaseAdapter } from '../database/index.js';
import type { Review } from '../types/index.js';

function formatReviewRow(row: any): Review {
  return {
    ...row,
    verified: Boolean(row.verified),
    tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : [],
    sellerReply: row.sellerReply ?? undefined,
    sellerReplyAt: row.sellerReplyAt ? Number(row.sellerReplyAt) : undefined,
  };
}

function refreshProductRating(db: DatabaseAdapter, productId: string): void {
  const stats = db.queryOne<{ avgRating: number; totalCount: number }>(
    'SELECT AVG(rating) as avgRating, COUNT(*) as totalCount FROM reviews WHERE productId = ?',
    [productId],
  );
  if (stats) {
    db.execute('UPDATE products SET rating = ?, reviewCount = ? WHERE id = ?', [
      Math.round(Number(stats.avgRating ?? 0) * 10) / 10,
      Number(stats.totalCount ?? 0),
      productId,
    ]);
  }
}

export async function getReviews(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const productId = (req.params.productId || req.query.productId) as string | undefined;
    const sellerId = req.query.sellerId as string | undefined;

    let rows: any[];
    if (productId) {
      rows = db.queryAll(
        'SELECT * FROM reviews WHERE productId = ? ORDER BY createdAt DESC',
        [productId],
      );
    } else if (sellerId) {
      rows = db.queryAll(
        `SELECT r.* FROM reviews r
         JOIN products p ON p.id = r.productId
         WHERE p.sellerId = ?
         ORDER BY r.createdAt DESC`,
        [sellerId],
      );
    } else {
      rows = db.queryAll('SELECT * FROM reviews ORDER BY createdAt DESC LIMIT 50');
    }

    res.json(rows.map(formatReviewRow));
  } catch (error) {
    console.error('Erreur getReviews:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des avis' });
  }
}

export async function createReview(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const user = req.user!;
    const productId = req.params.productId || req.body.productId;
    const { rating, title, comment, tags } = req.body;

    if (!productId || rating === undefined || !comment) {
      res.status(400).json({ error: 'productId, rating et comment sont obligatoires' });
      return;
    }

    const numRating = Number(rating);
    if (!Number.isFinite(numRating) || numRating < 1 || numRating > 5) {
      res.status(400).json({ error: 'La note doit être comprise entre 1 et 5' });
      return;
    }

    const product = db.queryOne<{ id: string; sellerId: string }>(
      'SELECT id, sellerId FROM products WHERE id = ?',
      [productId],
    );
    if (!product) {
      res.status(404).json({ error: 'Produit introuvable' });
      return;
    }

    const existing = db.queryOne('SELECT id FROM reviews WHERE productId = ? AND userId = ?', [
      productId,
      user.id,
    ]);
    if (existing) {
      res.status(409).json({ error: 'Vous avez déjà publié un avis sur ce produit.' });
      return;
    }

    // Achat vérifié : l'utilisateur a une commande non annulée contenant ce produit.
    const purchase = db.queryOne(
      `SELECT oi.id FROM order_items oi
       JOIN order_sellers os ON os.id = oi.orderSellerId
       WHERE oi.productId = ? AND oi.orderId IN (SELECT id FROM orders WHERE userId = ?)
         AND os.status <> 'cancelled'
       LIMIT 1`,
      [productId, user.id],
    );

    const id = `rev-${Date.now()}`;
    const createdAt = Date.now();

    db.execute(
      `INSERT INTO reviews (
        id, productId, userId, sellerId, userName, rating, title, comment, tags, verified, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        productId,
        user.id,
        product.sellerId ?? null,
        user.name,
        numRating,
        title ? String(title) : null,
        String(comment).trim(),
        tags ? JSON.stringify(tags) : null,
        purchase ? 1 : 0,
        createdAt,
      ],
    );

    refreshProductRating(db, productId);

    res.status(201).json(
      formatReviewRow(db.queryOne('SELECT * FROM reviews WHERE id = ?', [id])),
    );
  } catch (error) {
    console.error('Erreur createReview:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l’avis' });
  }
}

export async function deleteReview(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const user = req.user!;
    const { id } = req.params;
    const review = db.queryOne<any>('SELECT * FROM reviews WHERE id = ?', [id]);

    if (!review) {
      res.status(404).json({ error: 'Avis introuvable' });
      return;
    }

    const seller = user.role === 'seller'
      ? db.queryOne<{ id: string }>('SELECT id FROM sellers WHERE userId = ?', [user.id])
      : undefined;
    const product = db.queryOne<{ sellerId: string }>(
      'SELECT sellerId FROM products WHERE id = ?',
      [review.productId],
    );

    const canDelete =
      review.userId === user.id || (seller && product?.sellerId === seller.id);

    if (!canDelete) {
      res.status(403).json({ error: 'Vous ne pouvez pas supprimer cet avis.' });
      return;
    }

    db.execute('DELETE FROM reviews WHERE id = ?', [id]);
    refreshProductRating(db, review.productId);
    res.json({ message: 'Avis supprimé', id });
  } catch (error) {
    console.error('Erreur deleteReview:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l’avis' });
  }
}
