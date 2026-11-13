import { Request, Response } from 'express';
import Stripe from 'stripe';
import { getDb } from '../database/index.js';
import { PricingError, priceOrder } from '../services/pricing.js';

// Le client Stripe est créé à la demande : dotenv.config() s'exécute après l'import des modules.
let stripeClient: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

/**
 * Crée un PaymentIntent Stripe (mode test avec une clé sk_test_…).
 * Le montant est recalculé ici à partir des prix de la base : on ne fait pas confiance au client.
 */
export async function createPaymentIntent(req: Request, res: Response): Promise<void> {
  try {
    const stripe = getStripe();
    if (!stripe) {
      res.status(500).json({ error: 'STRIPE_SECRET_KEY manquante dans server/.env' });
      return;
    }

    const db = await getDb();
    const { items, shippingMode, shippingCost, couponCode } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Le panier est vide' });
      return;
    }

    const resolvedShipping =
      shippingCost !== undefined
        ? Number(shippingCost)
        : shippingMode === 'express'
          ? 4.99
          : 0;

    const pricing = priceOrder(db, items, {
      shippingCost: resolvedShipping,
      couponCode: typeof couponCode === 'string' ? couponCode : undefined,
    });

    for (const group of pricing.sellerOrders) {
      const seller = db.queryOne<{ status: string; shopName: string }>(
        'SELECT status, shopName FROM sellers WHERE id = ?',
        [group.sellerId],
      );
      if (!seller || seller.status !== 'active') {
        res.status(409).json({
          error: `La boutique « ${group.seller.shopName} » n’est plus disponible. Retirez ses articles du panier.`,
        });
        return;
      }
    }

    // L'application affiche des "$" : devise par défaut usd, modifiable avec STRIPE_CURRENCY (ex. eur).
    const currency = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();
    const amount = Math.round(pricing.total * 100);

    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        items: JSON.stringify(items).slice(0, 500),
        couponCode: couponCode ? String(couponCode).slice(0, 60) : '',
        shippingCost: String(pricing.shippingCost),
      },
    });

    res.json({
      clientSecret: intent.client_secret,
      amount,
      currency,
      summary: {
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountTotal,
        shippingCost: pricing.shippingCost,
        total: pricing.total,
      },
    });
  } catch (error) {
    if (error instanceof PricingError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('Erreur createPaymentIntent:', error);
    res.status(500).json({ error: 'Impossible de préparer le paiement Stripe' });
  }
}
