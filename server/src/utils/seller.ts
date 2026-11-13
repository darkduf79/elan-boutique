import { getDb, type DatabaseAdapter } from '../database/index.js';
import type { Seller, SellerPublic, SellerSummary } from '../types/index.js';

export function formatSellerRow(row: any): Seller {
  return {
    id: row.id,
    userId: row.userId,
    shopName: row.shopName ?? row.name ?? 'Boutique Élan',
    slug: row.slug ?? row.id,
    tagline: row.tagline ?? undefined,
    description: row.description ?? undefined,
    avatarUrl: row.avatarUrl ?? undefined,
    bannerUrl: row.bannerUrl ?? undefined,
    isPro: Boolean(row.isPro),
    status: (row.status as Seller['status']) ?? 'active',
    createdAt: row.createdAt ?? Date.now(),
  };
}

export function toSellerSummary(seller: Seller): SellerSummary {
  return {
    id: seller.id,
    shopName: seller.shopName,
    slug: seller.slug,
    tagline: seller.tagline,
    avatarUrl: seller.avatarUrl,
    isPro: seller.isPro,
  };
}

export async function getSellerByUserId(userId: string): Promise<Seller | undefined> {
  const db = await getDb();
  const row = db.queryOne('SELECT * FROM sellers WHERE userId = ?', [userId]);
  return row ? formatSellerRow(row) : undefined;
}

export async function getSellerByIdOrSlug(idOrSlug: string): Promise<Seller | undefined> {
  const db = await getDb();
  const row =
    db.queryOne('SELECT * FROM sellers WHERE id = ?', [idOrSlug]) ??
    db.queryOne('SELECT * FROM sellers WHERE slug = ?', [idOrSlug]);
  return row ? formatSellerRow(row) : undefined;
}

/** Calcule les indicateurs publics d'une boutique (note, ventes, produits). */
export function computeSellerPublic(db: DatabaseAdapter, seller: Seller): SellerPublic {
  const reviewStats = db.queryOne<{ avgRating: number; total: number }>(
    `SELECT AVG(r.rating) as avgRating, COUNT(*) as total
     FROM reviews r
     LEFT JOIN products p ON p.id = r.productId
     WHERE p.sellerId = ? OR r.sellerId = ?`,
    [seller.id, seller.id],
  );

  const productStats = db.queryOne<{ total: number; categories: string }>(
    `SELECT COUNT(*) as total, GROUP_CONCAT(DISTINCT category) as categories
     FROM products WHERE sellerId = ?`,
    [seller.id],
  );

  const salesStats = db.queryOne<{ total: number; monthly: number }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN createdAt >= ? THEN 1 ELSE 0 END) as monthly
     FROM order_sellers
     WHERE sellerId = ? AND status IN ('paid', 'shipped', 'delivered')`,
    [Date.now() - 30 * 24 * 3600 * 1000, seller.id],
  );

  const rating = Math.round(Number(reviewStats?.avgRating ?? 0) * 10) / 10;

  return {
    ...seller,
    kpis: {
      clientRating: rating || 5,
      monthlySales: Number(salesStats?.monthly ?? 0),
      onTimeShippingRate: 99.4,
    },
    rating: rating || 5,
    reviewCount: Number(reviewStats?.total ?? 0),
    salesCount: Number(salesStats?.total ?? 0),
    productCount: Number(productStats?.total ?? 0),
    categories: (productStats?.categories ?? '')
      .split(',')
      .map((category: string) => category.trim())
      .filter(Boolean),
  };
}
