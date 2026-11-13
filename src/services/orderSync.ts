import { api } from '@/services/api';
import { getPendingSyncOrders, updateLocalOrder } from '@/services/localDb';

/**
 * Pont entre les deux bases de données : pousse les commandes enregistrées
 * HORS-LIGNE vers la base EN LIGNE (serveur SQLite) dès que la connexion revient.
 * Chaque commande n'est envoyée qu'une seule fois (drapeau « synced »).
 */
let syncing = false;

export interface SyncResult {
  synced: number;
  failed: number;
}

export async function syncOfflineOrders(): Promise<SyncResult> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const pending = await getPendingSyncOrders();
    for (const order of pending) {
      if (!order.synced) {
        try {
          const created = await api.createOrder({
            items: order.items,
            shippingAddress: order.shippingAddress,
            deliveryMode: order.deliveryMode === 'express' ? 'express' : 'standard',
            shippingCost: order.shippingCost,
            status: 'paid',
          });
          await updateLocalOrder(order.id, {
            synced: true,
            syncedOrderId: created.id,
            // Les factures par vendeur sont générées côté serveur à la création.
            invoiceId: created.invoices?.[0]?.id ?? created.invoiceId,
            syncError: undefined,
          });
          synced += 1;
        } catch (err: any) {
          // Stock côté serveur peut-être insuffisant : on garde la commande
          // localement avec l'erreur, elle sera retentée au prochain retour en ligne.
          await updateLocalOrder(order.id, {
            syncError: err?.message || 'Synchronisation impossible',
          });
          failed += 1;
          continue;
        }
      }
    }
  } finally {
    syncing = false;
  }

  return { synced, failed };
}