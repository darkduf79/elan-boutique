import React, { type ReactElement } from 'react';
import {
  StripeProvider as NativeStripeProvider,
  initPaymentSheet,
  presentPaymentSheet,
} from '@stripe/stripe-react-native';

export const STRIPE_AVAILABLE = true;

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export function StripeProvider({ children }: { children: ReactElement | ReactElement[] }) {
  return (
    <NativeStripeProvider publishableKey={PUBLISHABLE_KEY} urlScheme="boutique-en-ligne">
      {children}
    </NativeStripeProvider>
  );
}

export type StripePayResult = 'paid' | 'canceled';

/** Ouvre la feuille de paiement Stripe. Lève une erreur en cas d'échec, renvoie 'canceled' si l'utilisateur ferme la feuille. */
export async function presentStripePayment(opts: {
  clientSecret: string;
  currency: string;
  name?: string;
  email?: string;
}): Promise<StripePayResult> {
  if (!PUBLISHABLE_KEY) {
    throw new Error('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY manquante (voir .env.example).');
  }

  const init = await initPaymentSheet({
    merchantDisplayName: 'Élan Boutique',
    paymentIntentClientSecret: opts.clientSecret,
    defaultBillingDetails: { name: opts.name, email: opts.email },
    returnURL: 'boutique-en-ligne://stripe-redirect',
    applePay: { merchantCountryCode: 'FR' },
    googlePay: { merchantCountryCode: 'FR', currencyCode: opts.currency.toUpperCase(), testEnv: true },
  });
  if (init.error) throw new Error(init.error.message);

  const { error } = await presentPaymentSheet();
  if (error) {
    if (error.code === 'Canceled') return 'canceled';
    throw new Error(error.message);
  }
  return 'paid';
}
