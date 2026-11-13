import { Request, Response } from 'express';
import { getDb, type DatabaseAdapter } from '../database/index.js';
import type { OrderSeller, OrderStatus } from '../types/index.js';
import { computeSellerPublic } from '../utils/seller.js';
import { formatProductRow, PRODUCT_SELECT } from '../utils/products.js';

type SellerOrder = OrderSeller & {
  buyer?: { id: string; name: string; email: string };
  shippingAddress?: string;
  deliveryMode?: string;
  orderCreatedAt: number;
};

function loadSellerOrders(db: DatabaseAdapter, sellerId: string, limit?: number): SellerOrder[] {
  const rows = db.queryAll<any>(
    `SELECT
       os.*,
       o.userId AS buyerId,
       o.shippingAddress,
       o.deliveryMode,
       o.createdAt AS orderCreatedAt,
       u.name AS buyerName,
       u.email AS buyerEmail
     FROM order_sellers os
     JOIN orders o ON o.id = os.orderId
     LEFT JOIN users u ON u.id = o.userId
     WHERE os.sellerId = ?
     ORDER BY os.createdAt DESC${limit ? ` LIMIT ${Number(limit)}` : ''}`,
    [sellerId],
  );

  return rows.map((row) => {
    const items = db.queryAll<any>(
      'SELECT * FROM order_items WHERE orderSellerId = ? ORDER BY id ASC',
      [row.id],
    );
    const invoice = db.queryOne<{ id: string }>(
      'SELECT id FROM invoices WHERE orderSellerId = ? ORDER BY createdAt ASC LIMIT 1',
      [row.id],
    );

    return {
      id: row.id,
      orderId: row.orderId,
      sellerId: row.sellerId,
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      shippingShare: Number(row.shippingShare),
      total: Number(row.total),
      status: (row.status === 'completed' ? 'delivered' : row.status) as OrderStatus,
      createdAt: Number(row.createdAt),
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        title: item.title,
        quantity: Number(item.quantity),
        price: Number(item.unitPrice),
        sellerId: item.sellerId,
      })),
      invoiceId: invoice?.id,
      buyer: row.buyerId
        ? { id: row.buyerId, name: row.buyerName, email: row.buyerEmail }
        : undefined,
      shippingAddress: row.shippingAddress ?? undefined,
      deliveryMode: row.deliveryMode ?? undefined,
      orderCreatedAt: Number(row.orderCreatedAt),
    };
  });
}

function loadSellerReviews(db: DatabaseAdapter, sellerId: string) {
  const rows = db.queryAll<any>(
    `SELECT r.*, p.title AS productTitle, p.image AS productImage
     FROM reviews r
     JOIN products p ON p.id = r.productId
     WHERE p.sellerId = ?
     ORDER BY r.createdAt DESC`,
    [sellerId],
  );

  return rows.map((row) => ({
    ...row,
    verified: Boolean(row.verified),
    tags: row.tags ? JSON.parse(row.tags) : [],
    productTitle: row.productTitle,
    productImage: row.productImage ?? undefined,
    sellerReplyAt: row.sellerReplyAt ? Number(row.sellerReplyAt) : undefined,
  }));
}

/** Profil boutique du vendeur connecté, enrichi des KPI publics. */
export async function getSellerProfile(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const seller = req.seller!;
    const publicSeller = computeSellerPublic(db, seller);

    const stats = db.queryOne<{
      totalProducts: number;
      onlineProducts: number;
      outOfStockProducts: number;
      lowStockProducts: number;
    }>(
      `SELECT
         COUNT(*) AS totalProducts,
         SUM(CASE WHEN isOnline = 1 THEN 1 ELSE 0 END) AS onlineProducts,
         SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) AS outOfStockProducts,
         SUM(CASE WHEN stock > 0 AND stock <= 5 THEN 1 ELSE 0 END) AS lowStockProducts
       FROM products WHERE sellerId = ?`,
      [seller.id],
    );

    const orderStats = db.queryOne<{ totalOrders: number; totalRevenue: number }>(
      `SELECT COUNT(*) AS totalOrders, COALESCE(SUM(total), 0) AS totalRevenue
       FROM order_sellers WHERE sellerId = ?`,
      [seller.id],
    );

    res.json({
      ...publicSeller,
      stats: {
        totalProducts: Number(stats?.totalProducts ?? 0),
        onlineProducts: Number(stats?.onlineProducts ?? 0),
        outOfStockProducts: Number(stats?.outOfStockProducts ?? 0),
        lowStockProducts: Number(stats?.lowStockProducts ?? 0),
        totalOrders: Number(orderStats?.totalOrders ?? 0),
        totalRevenue: Math.round(Number(orderStats?.totalRevenue ?? 0) * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Erreur getSellerProfile:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil vendeur' });
  }
}

export async function updateSellerProfile(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const seller = req.seller!;
    const { shopName, tagline, description, avatarUrl, bannerUrl } = req.body;

    if (shopName !== undefined && !String(shopName).trim()) {
      res.status(400).json({ error: 'Le nom de la boutique ne peut pas être vide.' });
      return;
    }

    const fields: [string, unknown][] = [];
    if (shopName !== undefined) fields.push(['shopName', String(shopName).trim()]);
    if (tagline !== undefined) fields.push(['tagline', tagline ? String(tagline) : null]);
    if (description !== undefined) {
      fields.push(['description', description ? String(description) : null]);
    }
    if (avatarUrl !== undefined) fields.push(['avatarUrl', avatarUrl ? String(avatarUrl) : null]);
    if (bannerUrl !== undefined) fields.push(['bannerUrl', bannerUrl ? String(bannerUrl) : null]);

    if (fields.length > 0) {
      db.execute(
        `UPDATE sellers SET ${fields.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`,
        [...fields.map(([, value]) => value), seller.id],
      );
    }

    const row = db.queryOne('SELECT * FROM sellers WHERE id = ?', [seller.id]);
    res.json(computeSellerPublic(db, { ...seller, ...(row as any) }));
  } catch (error) {
    console.error('Erreur updateSellerProfile:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil vendeur' });
  }
}

export async function getSellerDashboard(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const seller = req.seller!;
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const start30d = now - 30 * 24 * 3600 * 1000;

    const revenue = db.queryOne<{ today: number; month: number; totalAll: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN createdAt >= ? THEN total ELSE 0 END), 0) AS today,
         COALESCE(SUM(CASE WHEN createdAt >= ? THEN total ELSE 0 END), 0) AS month,
         COALESCE(SUM(total), 0) AS totalAll
       FROM order_sellers
       WHERE sellerId = ? AND status IN ('paid', 'shipped', 'delivered')`,
      [startOfToday, start30d, seller.id],
    );

    const orderStats = db.queryOne<{ total: number; pending: number }>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM order_sellers WHERE sellerId = ?`,
      [seller.id],
    );

    const productStats = db.queryOne<{
      total: number;
      online: number;
      lowStock: number;
      outOfStock: number;
    }>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN isOnline = 1 THEN 1 ELSE 0 END) AS online,
         SUM(CASE WHEN stock > 0 AND stock <= 5 THEN 1 ELSE 0 END) AS lowStock,
         SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) AS outOfStock
       FROM products WHERE sellerId = ?`,
      [seller.id],
    );

    const dayRows = db.queryAll<{ date: string; revenue: number; orders: number }>(
      `SELECT
         date(createdAt / 1000, 'unixepoch') AS date,
         COALESCE(SUM(total), 0) AS revenue,
         COUNT(*) AS orders
       FROM order_sellers
       WHERE sellerId = ? AND status IN ('paid', 'shipped', 'delivered') AND createdAt >= ?
       GROUP BY date(createdAt / 1000, 'unixepoch')
       ORDER BY date ASC`,
      [seller.id, now - 14 * 24 * 3600 * 1000],
    );

    const salesByDay: { date: string; revenue: number; orders: number }[] = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const day = new Date(now - offset * 24 * 3600 * 1000);
      const key = day.toISOString().slice(0, 10);
      const match = dayRows.find((row) => row.date === key);
      salesByDay.push({
        date: key,
        revenue: Math.round(Number(match?.revenue ?? 0) * 100) / 100,
        orders: Number(match?.orders ?? 0),
      });
    }

    res.json({
      revenueToday: Math.round(Number(revenue?.today ?? 0) * 100) / 100,
      revenue30d: Math.round(Number(revenue?.month ?? 0) * 100) / 100,
      revenueAll: Math.round(Number(revenue?.totalAll ?? 0) * 100) / 100,
      totalOrders: Number(orderStats?.total ?? 0),
      pendingOrders: Number(orderStats?.pending ?? 0),
      totalProducts: Number(productStats?.total ?? 0),
      onlineProducts: Number(productStats?.online ?? 0),
      lowStockProducts: Number(productStats?.lowStock ?? 0),
      outOfStockProducts: Number(productStats?.outOfStock ?? 0),
      salesByDay,
      recentOrders: loadSellerOrders(db, seller.id, 5),
    });
  } catch (error) {
    console.error('Erreur getSellerDashboard:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du tableau de bord' });
  }
}

export async function getSellerProducts(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const seller = req.seller!;
    const { q, status, sort } = req.query;

    let query = `${PRODUCT_SELECT} WHERE p.sellerId = ?`;
    const params: any[] = [seller.id];

    if (q && typeof q === 'string' && q.trim()) {
      const search = `%${q.trim()}%`;
      query += ' AND (p.title LIKE ? OR p.category LIKE ? OR p.ref LIKE ?)';
      params.push(search, search, search);
    }

    if (status === 'online') query += ' AND p.isOnline = 1';
    if (status === 'offline') query += ' AND p.isOnline = 0';
    if (status === 'low-stock') query += ' AND p.stock > 0 AND p.stock <= 5';
    if (status === 'out-of-stock') query += ' AND p.stock <= 0';

    switch (sort) {
      case 'prix-asc':
        query += ' ORDER BY p.price ASC';
        break;
      case 'prix-desc':
        query += ' ORDER BY p.price DESC';
        break;
      case 'stock':
        query += ' ORDER BY p.stock ASC';
        break;
      case 'ventes':
        query += ' ORDER BY p.reviewCount DESC';
        break;
      default:
        query += ' ORDER BY p.createdAt DESC';
        break;
    }

    const rows = db.queryAll(query, params);
    res.json(rows.map(formatProductRow));
  } catch (error) {
    console.error('Erreur getSellerProducts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
  }
}

export async function getSellerOrders(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const seller = req.seller!;
    res.json(loadSellerOrders(db, seller.id));
  } catch (error) {
    console.error('Erreur getSellerOrders:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes vendeur' });
  }
}

export async function getSellerInvoices(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const seller = req.seller!;

    const rows = db.queryAll<any>(
      `SELECT
         i.id,
         i.orderId,
         i.orderSellerId,
         i.sellerId,
         i.clientId,
         i.amount,
         i.status,
         i.createdAt,
         u.name AS clientName,
         u.email AS clientEmail
       FROM invoices i
       LEFT JOIN users u ON u.id = i.clientId
       WHERE i.sellerId = ?
       ORDER BY i.createdAt DESC`,
      [seller.id],
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        orderId: row.orderId ?? undefined,
        orderSellerId: row.orderSellerId ?? undefined,
        sellerId: row.sellerId,
        clientId: row.clientId,
        clientName: row.clientName ?? 'Client',
        clientEmail: row.clientEmail ?? undefined,
        amount: Number(row.amount),
        status: row.status,
        createdAt: Number(row.createdAt),
      })),
    );
  } catch (error) {
    console.error('Erreur getSellerInvoices:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des factures' });
  }
}

export async function getSellerReviews(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    res.json(loadSellerReviews(db, req.seller!.id));
  } catch (error) {
    console.error('Erreur getSellerReviews:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des avis' });
  }
}

export async function replyToReview(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const seller = req.seller!;
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || !String(reply).trim()) {
      res.status(400).json({ error: 'La réponse ne peut pas être vide.' });
      return;
    }

    const row = db.queryOne<any>(
      `SELECT r.* FROM reviews r
       JOIN products p ON p.id = r.productId
       WHERE r.id = ? AND p.sellerId = ?`,
      [id, seller.id],
    );

    if (!row) {
      res.status(404).json({ error: 'Avis introuvable pour votre boutique.' });
      return;
    }

    const sellerReplyAt = Date.now();
    db.execute('UPDATE reviews SET sellerReply = ?, sellerReplyAt = ? WHERE id = ?', [
      String(reply).trim(),
      sellerReplyAt,
      id,
    ]);

    res.json({ id, sellerReply: String(reply).trim(), sellerReplyAt });
  } catch (error) {
    console.error('Erreur replyToReview:', error);
    res.status(500).json({ error: 'Erreur lors de l’enregistrement de la réponse' });
  }
}
