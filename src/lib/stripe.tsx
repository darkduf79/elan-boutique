// Version web / par défaut : Stripe PaymentSheet n'existe que sur iOS et Android.
// Metro charge stripe.native.tsx sur mobile ; ce fichier sert au web et au typage.
import React, { type ReactNode } from 'react';

export const STRIPE_AVAILABLE = false;

export function StripeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export type StripePayResult = 'paid' | 'canceled';

export async function presentStripePayment(_opts: {
  clientSecret: string;
  currency: string;
  name?: string;
  email?: string;
}): Promise<StripePayResult> {
  throw new Error('Le paiement Stripe est disponible uniquement sur l’application mobile.');
}
