import type { DatabaseAdapter } from '../database/index.js';
import type { Coupon, OrderItem, Seller, SellerSummary } from '../types/index.js';
import { formatSellerRow, toSellerSummary } from '../utils/seller.js';

export class PricingError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface RawPricingItem {
  productId?: unknown;
  quantity?: unknown;
}

export interface PricedItem extends OrderItem {
  sellerId: string;
  lineTotal: number;
}

export interface PricedSellerGroup {
  sellerId: string;
  seller: SellerSummary;
  items: PricedItem[];
  subtotal: number;
  discount: number;
  shippingShare: number;
  total: number;
  coupon?: Coupon;
}

export interface PricedOrder {
  sellerOrders: PricedSellerGroup[];
  items: PricedItem[];
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  total: number;
  coupon?: Coupon;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseItems(rawItems: unknown): { productId: string; quantity: number }[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new PricingError(400, 'La commande doit contenir au moins un article');
  }

  const quantities = new Map<string, number>();
  for (const item of rawItems as RawPricingItem[]) {
    if (
      typeof item?.productId !== 'string' ||
      !Number.isInteger(Number(item?.quantity)) ||
      Number(item.quantity) <= 0
    ) {
      throw new PricingError(
        400,
        'Article invalide : productId et quantité entière positive requis',
      );
    }
    const productId = item.productId;
    quantities.set(productId, (quantities.get(productId) ?? 0) + Number(item.quantity));
  }

  return [...quantities.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

function findCoupon(db: DatabaseAdapter, code: string): Coupon {
  const row = db.queryOne<any>('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)', [code.trim()]);
  if (!row) {
    throw new PricingError(400, `Code promo « ${code} » introuvable.`);
  }

  const coupon: Coupon = {
    ...row,
    isActive: Boolean(row.isActive),
    value: Number(row.value),
    minSubtotal: Number(row.minSubtotal),
    maxUses: Number(row.maxUses),
    usedCount: Number(row.usedCount),
  };

  const now = Date.now();
  if (!coupon.isActive) {
    throw new PricingError(400, 'Ce code promo n’est plus actif.');
  }
  if (coupon.startsAt && now < coupon.startsAt) {
    throw new PricingError(400, 'Ce code promo n’est pas encore valide.');
  }
  if (coupon.endsAt && now > coupon.endsAt) {
    throw new PricingError(400, 'Ce code promo a expiré.');
  }
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    throw new PricingError(400, 'Ce code promo a atteint son nombre maximum d’utilisations.');
  }

  return coupon;
}

/** Calcule le prix d'un panier multi-vendeurs et répartit la livraison. */
export function priceOrder(
  db: DatabaseAdapter,
  rawItems: unknown,
  options: { shippingCost?: number; couponCode?: string } = {},
): PricedOrder {
  const shippingCost = Number(options.shippingCost ?? 0);
  if (!Number.isFinite(shippingCost) || shippingCost < 0) {
    throw new PricingError(400, 'Frais de livraison invalides.');
  }

  const requestedItems = parseItems(rawItems);
  const groups = new Map<
    string,
    { seller: Seller; items: PricedItem[]; subtotal: number }
  >();

  for (const item of requestedItems) {
    const product = db.queryOne<any>(
      `SELECT
         p.id AS productId, p.title, p.price, p.stock, p.sellerId,
         s.id AS sellerRowId, s.userId AS sellerUserId, s.shopName AS sellerShopName,
         s.slug AS sellerSlug, s.tagline AS sellerTagline, s.description AS sellerDescription,
         s.avatarUrl AS sellerAvatarUrl, s.bannerUrl AS sellerBannerUrl,
         s.isPro AS sellerIsPro, s.status AS sellerStatus, s.createdAt AS sellerCreatedAt
       FROM products p
       LEFT JOIN sellers s ON s.id = p.sellerId
       WHERE p.id = ?`,
      [item.productId],
    );

    if (!product) {
      throw new PricingError(404, `Produit introuvable : ${item.productId}`);
    }
    if (product.stock < item.quantity) {
      throw new PricingError(
        409,
        `Stock insuffisant pour « ${product.title} » : ${product.stock} disponible(s), ${item.quantity} demandé(s).`,
      );
    }
    if (!product.sellerId || !product.sellerRowId) {
      throw new PricingError(409, `Le produit « ${product.title} » n’a pas de boutique associée.`);
    }

    const seller = formatSellerRow({
      id: product.sellerRowId,
      userId: product.sellerUserId,
      shopName: product.sellerShopName,
      slug: product.sellerSlug,
      tagline: product.sellerTagline,
      description: product.sellerDescription,
      avatarUrl: product.sellerAvatarUrl,
      bannerUrl: product.sellerBannerUrl,
      isPro: product.sellerIsPro,
      status: product.sellerStatus,
      createdAt: product.sellerCreatedAt,
    });

    const unitPrice = Number(product.price);
    const lineTotal = round(unitPrice * item.quantity);
    const pricedItem: PricedItem = {
      productId: product.productId,
      sellerId: product.sellerId,
      title: product.title,
      quantity: item.quantity,
      price: unitPrice,
      lineTotal,
    };

    if (!groups.has(product.sellerId)) {
      groups.set(product.sellerId, { seller, items: [], subtotal: 0 });
    }
    const group = groups.get(product.sellerId)!;
    group.items.push(pricedItem);
    group.subtotal = round(group.subtotal + lineTotal);
  }

  const pricedGroups = [...groups.values()];
  const subtotal = round(pricedGroups.reduce((sum, group) => sum + group.subtotal, 0));

  let coupon: Coupon | undefined;
  let couponSellerId: string | undefined;
  if (options.couponCode && options.couponCode.trim()) {
    coupon = findCoupon(db, options.couponCode);
    const matchingGroup = pricedGroups.find((group) => group.seller.id === coupon!.sellerId);
    if (!matchingGroup) {
      throw new PricingError(
        400,
        'Ce code promo ne s’applique à aucun article de votre panier.',
      );
    }
    if (matchingGroup.subtotal < coupon.minSubtotal) {
      throw new PricingError(
        400,
        `Ce code promo nécessite un minimum de ${coupon.minSubtotal.toFixed(2)} € chez ce vendeur.`,
      );
    }
    couponSellerId = coupon.sellerId;
  }

  // Répartition proportionnelle des frais de livraison, méthode du plus fort reste.
  const shares = pricedGroups.map(() => 0);
  if (shippingCost > 0 && pricedGroups.length > 0) {
    if (subtotal <= 0) {
      const each = round(shippingCost / pricedGroups.length);
      shares.fill(each);
    } else {
      let allocated = 0;
      let largestIndex = 0;
      let largestRemainder = -Infinity;
      pricedGroups.forEach((group, index) => {
        const exact = (shippingCost * group.subtotal) / subtotal;
        const floored = Math.floor(exact * 100) / 100;
        shares[index] = floored;
        allocated += floored;
        const remainder = exact - floored;
        if (remainder > largestRemainder) {
          largestRemainder = remainder;
          largestIndex = index;
        }
      });
      const missing = round(shippingCost - allocated);
      if (missing > 0) shares[largestIndex] = round(shares[largestIndex] + missing);
    }
  }

  let discountTotal = 0;
  const sellerOrders: PricedSellerGroup[] = pricedGroups.map((group, index) => {
    let discount = 0;
    if (coupon && couponSellerId === group.seller.id) {
      discount =
        coupon.type === 'percent'
          ? round(Math.min(group.subtotal, (group.subtotal * coupon.value) / 100))
          : round(Math.min(group.subtotal, coupon.value));
    }

    discountTotal = round(discountTotal + discount);
    const groupTotal = round(group.subtotal - discount + shares[index]);

    return {
      sellerId: group.seller.id,
      seller: toSellerSummary(group.seller),
      items: group.items,
      subtotal: group.subtotal,
      discount,
      shippingShare: shares[index],
      total: groupTotal,
      coupon: coupon && couponSellerId === group.seller.id ? coupon : undefined,
    };
  });

  return {
    sellerOrders,
    items: pricedGroups.flatMap((group) => group.items),
    subtotal,
    discountTotal,
    shippingCost: round(shippingCost),
    total: round(subtotal - discountTotal + shippingCost),
    coupon,
  };
}
