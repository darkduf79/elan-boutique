import { colors } from '@/constants/theme';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export interface DeliveryMode {
  id: 'standard' | 'express';
  label: string;
  delay: string;
  cost: number;
  icon: string;
}

export const DELIVERY_MODES: DeliveryMode[] = [
  { id: 'standard', label: 'Livraison Standard', delay: '2 à 5 jours ouvrés', cost: 0, icon: 'cube-outline' },
  { id: 'express', label: 'Livraison Express', delay: '24 à 48 heures', cost: 4.99, icon: 'flash-outline' },
];

export function getDeliveryMode(id?: string): DeliveryMode {
  return DELIVERY_MODES.find((m) => m.id === id) ?? DELIVERY_MODES[0];
}

/** Mappe les anciens statuts (completed) vers le nouveau modèle à 5 statuts. */
export function normalizeStatus(status?: string): OrderStatus {
  switch (status) {
    case 'paid':
    case 'shipped':
    case 'delivered':
    case 'cancelled':
      return status;
    case 'completed':
      return 'delivered';
    case 'pending':
    default:
      return 'pending';
  }
}

export interface StatusMeta {
  label: string;
  short: string;
  color: string;
  bg: string;
  icon: string;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  pending: { label: 'En attente', short: 'En attente', color: colors.amberInk, bg: colors.amberSoft, icon: 'time-outline' },
  paid: { label: 'Payée', short: 'Payée', color: colors.primary, bg: colors.primarySoft, icon: 'card-outline' },
  shipped: { label: 'Expédiée', short: 'Expédiée', color: '#7C3AED', bg: '#F3EEFF', icon: 'cube-outline' },
  delivered: { label: 'Livrée', short: 'Livrée', color: colors.mintInk, bg: colors.mint, icon: 'checkmark-circle' },
  cancelled: { label: 'Annulée', short: 'Annulée', color: colors.roseInk, bg: colors.roseSoft, icon: 'close-circle' },
};

/** Ordre de progression (annulée est un état terminal à part). */
export const STATUS_FLOW: OrderStatus[] = ['pending', 'paid', 'shipped', 'delivered'];

export function statusIndex(status: OrderStatus): number {
  return STATUS_FLOW.indexOf(status);
}