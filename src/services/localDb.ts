import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiOrder } from '@/services/api';

/**
 * Base de données HORS-LIGNE de l'application (persistée sur l'appareil).
 * Elle enregistre les commandes payées en mode simulation quand le serveur
 * est injoignable. Dès le retour en ligne, ces commandes sont synchronisées
 * vers la base EN LIGNE (SQLite du serveur) par orderSync.ts.
 */
const ORDERS_KEY = '@elan_local_orders';

export type PaymentMethod = 'stripe' | 'simulation';

export interface LocalOrder extends ApiOrder {
  offline: true;
  paymentMethod: PaymentMethod;
  synced: boolean;
  syncedOrderId?: string;
  invoiceError?: string;
  syncError?: string;
}

async function readAll(): Promise<LocalOrder[]> {
  try {
    const raw = await AsyncStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalOrder[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(orders: LocalOrder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // Stockage indisponible : la commande reste en mémoire pour la session.
  }
}

export function createLocalOrderId(): string {
  return `off-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function getLocalOrders(): Promise<LocalOrder[]> {
  const orders = await readAll();
  return orders.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getLocalOrder(id: string): Promise<LocalOrder | null> {
  const orders = await readAll();
  return orders.find((order) => order.id === id) ?? null;
}

export async function saveLocalOrder(order: LocalOrder): Promise<void> {
  const orders = await readAll();
  const index = orders.findIndex((o) => o.id === order.id);
  if (index >= 0) orders[index] = order;
  else orders.push(order);
  await writeAll(orders);
}

export async function updateLocalOrder(
  id: string,
  patch: Partial<LocalOrder>,
): Promise<LocalOrder | null> {
  const orders = await readAll();
  const index = orders.findIndex((o) => o.id === id);
  if (index < 0) return null;
  const updated: LocalOrder = { ...orders[index], ...patch };
  orders[index] = updated;
  await writeAll(orders);
  return updated;
}

export async function getPendingSyncOrders(): Promise<LocalOrder[]> {
  const orders = await readAll();
  // Une commande synchronisée sans facture doit repasser pour créer sa facture.
  return orders.filter((order) => !order.synced || !order.invoiceId);
}

export async function deleteLocalOrder(id: string): Promise<void> {
  const orders = await readAll();
  await writeAll(orders.filter((order) => order.id !== id));
}