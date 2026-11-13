import { Request, Response } from 'express';
import { getDb, type DatabaseAdapter } from '../database/index.js';
import { getUserFromRequest } from '../middleware/auth.js';
import type { Order, OrderItem, OrderSeller, OrderStatus } from '../types/index.js';
import { PricingError, priceOrder, type PricedSellerGroup } from '../services/pricing.js';

const ALLOWED_STATUSES: OrderStatus[] = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
const DELIVERY_MODES = ['standard', 'express'];

function parseJson<T>(raw: unknown, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatSellerSummary(row: any) {
  return {
    id: row.sellerId,
    shopName: row.sellerShopName ?? 'Boutique Élan',
    slug: row.sellerSlug ?? row.sellerId,
    tagline: row.sellerTagline ?? undefined,
    avatarUrl: row.sellerAvatarUrl ?? undefined,
    isPro: Boolean(row.sellerIsPro),
  };
}

export function buildOrder(db: DatabaseAdapter, orderRow: any): Order {
  const status: OrderStatus =
    orderRow.status === 'completed' ? 'delivered' : (orderRow.status as OrderStatus);

  const groups = db.queryAll<any>(
    `SELECT
       os.*,
       s.shopName AS sellerShopName,
       s.slug AS sellerSlug,
       s.tagline AS sellerTagline,
       s.avatarUrl AS sellerAvatarUrl,
       s.isPro AS sellerIsPro
     FROM order_sellers os
     LEFT JOIN sellers s ON s.id = os.sellerId
     WHERE os.orderId = ?
     ORDER BY os.createdAt ASC, os.id ASC`,
    [orderRow.id],
  );

  const sellerOrders: OrderSeller[] = groups.map((group) => {
    const itemRows = db.queryAll<any>(
      'SELECT * FROM order_items WHERE orderSellerId = ? ORDER BY id ASC',
      [group.id],
    );
    const items: OrderItem[] = itemRows.map((item) => ({
      id: item.id,
      productId: item.productId,
      title: item.title,
      quantity: Number(item.quantity),
      price: Number(item.unitPrice),
      sellerId: item.sellerId,
    }));
    const invoice = db.queryOne<{ id: string }>(
      'SELECT id FROM invoices WHERE orderSellerId = ? ORDER BY createdAt ASC LIMIT 1',
      [group.id],
    );

    return {
      id: group.id,
      orderId: group.orderId,
      sellerId: group.sellerId,
      seller: formatSellerSummary(group),
      subtotal: Number(group.subtotal),
      discount: Number(group.discount),
      shippingShare: Number(group.shippingShare),
      total: Number(group.total),
      status: (group.status === 'completed' ? 'delivered' : group.status) as OrderStatus,
      createdAt: Number(group.createdAt),
      items,
      invoiceId: invoice?.id,
    };
  });

  const invoices = db.queryAll<{ id: string; sellerId: string; amount: number }>(
    'SELECT id, sellerId, amount FROM invoices WHERE orderId = ? ORDER BY createdAt ASC',
    [orderRow.id],
  );

  // Compatibilité avec les anciennes commandes sans groupes vendeurs.
  const legacyItems = parseJson<OrderItem[]>(orderRow.items, []);
  const items = sellerOrders.length > 0 ? sellerOrders.flatMap((group) => group.items) : legacyItems;

  return {
    id: orderRow.id,
    userId: orderRow.userId,
    items,
    total: Number(orderRow.total),
    status,
    shippingAddress: orderRow.shippingAddress ?? undefined,
    deliveryMode: orderRow.deliveryMode ?? undefined,
    shippingCost: Number(orderRow.shippingCost ?? 0),
    discountTotal: Number(orderRow.discountTotal ?? 0),
    invoiceId: invoices[0]?.id,
    sellerOrders,
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      sellerId: invoice.sellerId,
      amount: Number(invoice.amount),
    })),
    createdAt: Number(orderRow.createdAt),
  };
}

function recomputeOrderStatus(db: DatabaseAdapter, orderId: string): OrderStatus {
  const groups = db.queryAll<{ status: OrderStatus }>(
    'SELECT status FROM order_sellers WHERE orderId = ?',
    [orderId],
  );
  if (groups.length === 0) return 'pending';

  const active = groups.filter((group) => group.status !== 'cancelled');
  if (active.length === 0) return 'cancelled';

  if (active.every((group) => group.status === 'delivered')) return 'delivered';
  if (active.every((group) => group.status === 'shipped' || group.status === 'delivered')) {
    return 'shipped';
  }
  if (
    active.every((group) =>
      ['paid', 'shipped', 'delivered'].includes(group.status),
    )
  ) {
    return 'paid';
  }
  return 'pending';
}

export async function getOrders(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Authentification requise pour consulter vos commandes.' });
      return;
    }

    const rows = db.queryAll('SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC', [
      user.id,
    ]);
    res.json(rows.map((row) => buildOrder(db, row)));
  } catch (error) {
    console.error('Erreur getOrders:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
  }
}

export async function getOrderById(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Authentification requise.' });
      return;
    }

    const { id } = req.params;
    const row = db.queryOne<any>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!row) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    const isBuyer = row.userId === user.id;
    const isSeller = Boolean(
      db.queryOne('SELECT id FROM order_sellers WHERE orderId = ? AND sellerId IN (SELECT id FROM sellers WHERE userId = ?)', [
        id,
        user.id,
      ]),
    );

    if (!isBuyer && !isSeller) {
      res.status(403).json({ error: 'Vous n’avez pas accès à cette commande.' });
      return;
    }

    res.json(buildOrder(db, row));
  } catch (error) {
    console.error('Erreur getOrderById:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la commande' });
  }
}

function createInvoice(
  db: DatabaseAdapter,
  orderId: string,
  groupId: string,
  group: PricedSellerGroup,
  clientId: string,
): string {
  const id = `fac-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.execute(
    `INSERT INTO invoices (
      id, orderId, orderSellerId, sellerId, clientId, productId, amount, status, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
    [
      id,
      orderId,
      groupId,
      group.sellerId,
      clientId,
      group.items[0]?.productId ?? '',
      group.total,
      Date.now(),
    ],
  );
  return id;
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const user = await getUserFromRequest(req);
    const { items, shippingAddress, userId, status, deliveryMode, shippingCost, couponCode } =
      req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'La commande doit contenir au moins un article' });
      return;
    }

    const initialStatus: OrderStatus = status ?? 'pending';
    if (!ALLOWED_STATUSES.includes(initialStatus)) {
      res.status(400).json({ error: `Statut invalide. Valeurs acceptées : ${ALLOWED_STATUSES.join(', ')}` });
      return;
    }

    const mode = deliveryMode ?? 'standard';
    if (!DELIVERY_MODES.includes(mode)) {
      res.status(400).json({ error: 'Mode de livraison invalide (standard ou express).' });
      return;
    }

    const pricing = priceOrder(db, items, {
      shippingCost: Number(shippingCost ?? 0),
      couponCode: typeof couponCode === 'string' ? couponCode : undefined,
    });

    const id = `cmd-${Date.now()}`;
    const createdAt = Date.now();
    const buyerId = user?.id ?? (typeof userId === 'string' && userId ? userId : 'user-demo-1');
    const address = shippingAddress ?? 'Adresse de livraison par défaut';

    db.transaction(() => {
      // Décrémente le stock de chaque ligne (contrôle atomique).
      for (const item of pricing.items) {
        const update = db.execute(
          'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
          [item.quantity, item.productId, item.quantity],
        );
        if (update.changes !== 1) {
          throw new PricingError(409, `Stock insuffisant pour « ${item.title} ».`);
        }
      }

      db.execute(
        `INSERT INTO orders (
          id, userId, items, total, status, shippingAddress, deliveryMode,
          shippingCost, discountTotal, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          buyerId,
          JSON.stringify(pricing.items),
          pricing.total,
          initialStatus,
          address,
          mode,
          pricing.shippingCost,
          pricing.discountTotal,
          createdAt,
        ],
      );

      pricing.sellerOrders.forEach((group, groupIndex) => {
        const orderSellerId = `os-${id.replace(/^cmd-/, '')}-${groupIndex + 1}`;
        db.execute(
          `INSERT INTO order_sellers (
            id, orderId, sellerId, subtotal, discount, shippingShare, total, status, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderSellerId,
            id,
            group.sellerId,
            group.subtotal,
            group.discount,
            group.shippingShare,
            group.total,
            initialStatus,
            createdAt,
          ],
        );

        group.items.forEach((item, itemIndex) => {
          db.execute(
            `INSERT INTO order_items (
              id, orderId, orderSellerId, productId, sellerId, title, quantity, unitPrice, lineTotal
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              `oi-${id.replace(/^cmd-/, '')}-${groupIndex + 1}-${itemIndex + 1}`,
              id,
              orderSellerId,
              item.productId,
              item.sellerId,
              item.title,
              item.quantity,
              item.price,
              item.lineTotal,
            ],
          );
        });

        createInvoice(db, id, orderSellerId, group, buyerId);

        if (group.coupon) {
          db.execute(
            `INSERT INTO coupon_redemptions (id, couponId, orderId, userId, amount, createdAt)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              `cr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              group.coupon.id,
              id,
              buyerId,
              group.discount,
              createdAt,
            ],
          );
          db.execute('UPDATE coupons SET usedCount = usedCount + 1 WHERE id = ?', [
            group.coupon.id,
          ]);
        }
      });
    });

    const created = db.queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    res.status(201).json(buildOrder(db, created));
  } catch (error) {
    if (error instanceof PricingError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('Erreur createOrder:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la commande' });
  }
}

/**
 * Mise à jour d'un sous-commande vendeur.
 * Utilisé par le vendeur mais aussi conservé pour la compatibilité de l'API.
 */
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  try {
    const db = await getDb();
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Authentification requise.' });
      return;
    }

    const { id } = req.params;
    const { status, orderSellerId } = req.body;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      res.status(400).json({
        error: `Statut invalide. Valeurs acceptées : ${ALLOWED_STATUSES.join(', ')}`,
      });
      return;
    }

    const seller = db.queryOne<any>('SELECT * FROM sellers WHERE userId = ?', [user.id]);
    const order = db.queryOne<any>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable' });
      return;
    }

    let group = orderSellerId
      ? db.queryOne<any>('SELECT * FROM order_sellers WHERE id = ? AND orderId = ?', [
          orderSellerId,
          id,
        ])
      : undefined;

    if (!group && seller) {
      group = db.queryOne<any>(
        'SELECT * FROM order_sellers WHERE orderId = ? AND sellerId = ? LIMIT 1',
        [id, seller.id],
      );
    }

    if (!group) {
      res.status(404).json({ error: 'Sous-commande vendeur introuvable.' });
      return;
    }

    if (seller && group.sellerId !== seller.id) {
      res.status(403).json({ error: 'Cette commande appartient à une autre boutique.' });
      return;
    }

    applyGroupStatus(db, group, status);
    const updated = db.queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    res.json(buildOrder(db, updated));
  } catch (error) {
    if (error instanceof PricingError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('Erreur updateOrderStatus:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du statut de la commande' });
  }
}

/** Applique un statut à un groupe vendeur, restaure/retire le stock si besoin. */
export function applyGroupStatus(
  db: DatabaseAdapter,
  group: any,
  nextStatus: OrderStatus,
): void {
  const previous = group.status === 'completed' ? 'delivered' : group.status;
  if (previous === nextStatus) return;

  db.transaction(() => {
    const items = db.queryAll<any>('SELECT * FROM order_items WHERE orderSellerId = ?', [group.id]);

    if (nextStatus === 'cancelled' && previous !== 'cancelled') {
      for (const item of items) {
        db.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [
          item.quantity,
          item.productId,
        ]);
      }
    }

    if (previous === 'cancelled' && nextStatus !== 'cancelled') {
      for (const item of items) {
        const update = db.execute(
          'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
          [item.quantity, item.productId, item.quantity],
        );
        if (update.changes !== 1) {
          throw new PricingError(
            409,
            `Stock insuffisant pour réactiver « ${item.title} ».`,
          );
        }
      }
    }

    db.execute('UPDATE order_sellers SET status = ? WHERE id = ?', [nextStatus, group.id]);
    const aggregate = recomputeOrderStatus(db, group.orderId);
    db.execute('UPDATE orders SET status = ? WHERE id = ?', [aggregate, group.orderId]);
  });
}
