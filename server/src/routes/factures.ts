import { Router } from 'express';
import { getDb, type DatabaseAdapter } from '../database/index.js';

const router = Router();

interface InvoiceItem {
  productId: string;
  title: string;
  quantity: number;
  price: number;
}

function parseOrderItems(raw: string | null | undefined): InvoiceItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function groupItems(db: DatabaseAdapter, groupId: string | null | undefined): InvoiceItem[] {
  if (!groupId) return [];
  const rows = db.queryAll<any>(
    'SELECT * FROM order_items WHERE orderSellerId = ? ORDER BY id ASC',
    [groupId],
  );
  return rows.map((row) => ({
    productId: row.productId,
    title: row.title,
    quantity: Number(row.quantity),
    price: Number(row.unitPrice),
  }));
}

// 1. Génère les factures d'une commande (une par sous-commande vendeur).
router.post('/api/factures', async (req, res) => {
  try {
    const { orderId, sellerId, clientId } = req.body;
    const db = await getDb();

    if (!orderId) {
      return res.status(400).json({ error: 'orderId est obligatoire pour générer une facture.' });
    }

    const order = db.queryOne<any>('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    const groups = sellerId
      ? db.queryAll<any>('SELECT * FROM order_sellers WHERE orderId = ? AND sellerId = ?', [
          order.id,
          sellerId,
        ])
      : db.queryAll<any>('SELECT * FROM order_sellers WHERE orderId = ?', [order.id]);

    const invoiceIds: string[] = [];
    const createdAt = Date.now();

    db.transaction(() => {
      for (const group of groups) {
        // Idempotence : une synchronisation hors-ligne peut réessayer la facture.
        const existing = db.queryOne<{ id: string }>(
          'SELECT id FROM invoices WHERE orderSellerId = ? ORDER BY createdAt ASC LIMIT 1',
          [group.id],
        );
        if (existing) {
          invoiceIds.push(existing.id);
          continue;
        }

        const items = groupItems(db, group.id);
        const firstProductId = items[0]?.productId;
        if (!firstProductId) continue;

        const id = `fac-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        db.execute(
          `INSERT INTO invoices (
            id, orderId, orderSellerId, sellerId, clientId, productId, amount, status, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
          [
            id,
            order.id,
            group.id,
            group.sellerId,
            clientId || order.userId || '',
            firstProductId,
            Number(group.total || 0),
            createdAt,
          ],
        );
        invoiceIds.push(id);
      }

      // Compatibilité avec une commande historique sans sous-commandes.
      if (invoiceIds.length === 0) {
        const legacyItems = parseOrderItems(order.items);
        if (legacyItems[0]?.productId && sellerId) {
          const id = `fac-${Date.now()}`;
          db.execute(
            `INSERT INTO invoices (
              id, orderId, sellerId, clientId, productId, amount, status, createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, 'paid', ?)`,
            [
              id,
              order.id,
              sellerId,
              clientId || order.userId || '',
              legacyItems[0].productId,
              Number(order.total || 0),
              createdAt,
            ],
          );
          invoiceIds.push(id);
        }
      }
    });

    if (invoiceIds.length === 0) {
      return res.status(400).json({ error: 'La commande ne contient aucune sous-commande facturable.' });
    }

    return res.status(201).json({
      message: 'Facture(s) générée(s) avec succès',
      invoiceId: invoiceIds[0],
      invoiceIds,
      orderId: order.id,
    });
  } catch (error) {
    console.error('Erreur POST facture:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la facture' });
  }
});

// 2. Détail d'une facture (vendeur + lignes de la sous-commande).
router.get('/api/factures/:id', async (req, res) => {
  try {
    const db = await getDb();

    const facture = db.queryOne<any>(
      `SELECT
         i.id AS facture_id,
         i.orderId,
         i.orderSellerId,
         i.amount,
         i.createdAt,
         COALESCE(s.shopName, 'Vendeur Inconnu') AS vendeur_nom,
         COALESCE(s.tagline, '') AS vendeur_slogan,
         COALESCE(s.slug, '') AS vendeur_slug,
         COALESCE(u.name, 'Client Inconnu') AS client_nom,
         COALESCE(p.title, 'Produit Inconnu') AS produit_titre,
         p.image AS produit_image,
         o.items AS order_items,
         o.shippingAddress AS shippingAddress
       FROM invoices i
       LEFT JOIN sellers s ON i.sellerId = s.id
       LEFT JOIN users u ON i.clientId = u.id
       LEFT JOIN products p ON i.productId = p.id
       LEFT JOIN orders o ON i.orderId = o.id
       WHERE i.id = ?`,
      [req.params.id],
    );

    if (!facture) {
      return res.status(404).json({ error: 'Facture introuvable' });
    }

    let items = groupItems(db, facture.orderSellerId);
    if (items.length === 0) {
      const legacyItems = parseOrderItems(facture.order_items);
      items =
        legacyItems.length > 0
          ? legacyItems
          : [
              {
                productId: '',
                title: facture.produit_titre,
                quantity: 1,
                price: Number(facture.amount),
              },
            ];
    }

    res.json({
      facture_id: facture.facture_id,
      orderId: facture.orderId ?? undefined,
      orderSellerId: facture.orderSellerId ?? undefined,
      amount: Number(facture.amount),
      createdAt: Number(facture.createdAt),
      vendeur_nom: facture.vendeur_nom,
      vendeur_slogan: facture.vendeur_slogan,
      vendeur_slug: facture.vendeur_slug,
      client_nom: facture.client_nom,
      produit_titre: facture.produit_titre,
      produit_image: facture.produit_image,
      shippingAddress: facture.shippingAddress ?? undefined,
      items,
    });
  } catch (error) {
    console.error('Erreur GET facture:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des détails' });
  }
});

export default router;
