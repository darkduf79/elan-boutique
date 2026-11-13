import type { Product, SellerSummary } from '../types/index.js';

function parseJsonArray(value: unknown): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatProductRow(row: any): Product {
  const product: Product = {
    ...row,
    sellerId: row.sellerId,
    price: Number(row.price),
    oldPrice: row.oldPrice === null || row.oldPrice === undefined ? undefined : Number(row.oldPrice),
    stock: Number(row.stock),
    rating: Number(row.rating),
    reviewCount: Number(row.reviewCount),
    recommend: Number(row.recommend),
    isOnline: Boolean(row.isOnline),
    images: parseJsonArray(row.images),
    finishes: parseJsonArray(row.finishes),
    features: parseJsonArray(row.features),
  };

  if (row.sellerShopName !== undefined) {
    product.seller = {
      id: row.sellerId,
      shopName: row.sellerShopName,
      slug: row.sellerSlug,
      tagline: row.sellerTagline ?? undefined,
      avatarUrl: row.sellerAvatarUrl ?? undefined,
      isPro: Boolean(row.sellerIsPro),
    } satisfies SellerSummary;
  }

  return product;
}

export const PRODUCT_SELECT = `
  SELECT
    p.*,
    s.shopName AS sellerShopName,
    s.slug AS sellerSlug,
    s.tagline AS sellerTagline,
    s.avatarUrl AS sellerAvatarUrl,
    s.isPro AS sellerIsPro
  FROM products p
  LEFT JOIN sellers s ON s.id = p.sellerId
`;
