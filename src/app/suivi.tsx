import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { ServerOfflineView } from '@/components/ServerOfflineView';
import { formatPrice } from '@/lib/format';
import { getDeliveryMode, normalizeStatus, STATUS_META, statusIndex } from '@/lib/orderStatus';
import { api, type ApiOrder } from '@/services/api';
import { getLocalOrder } from '@/services/localDb';

export default function SuiviScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localOffline, setLocalOffline] = useState(false);
  const [localSynced, setLocalSynced] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Commande hors-ligne : lue directement dans la base locale.
      if (orderId && orderId.startsWith('off-')) {
        const local = await getLocalOrder(orderId);
        if (local) {
          setOrder(local);
          setLocalOffline(true);
          setLocalSynced(local.synced);
        } else {
          setOrder(null);
          setError('Commande hors-ligne introuvable sur cet appareil.');
        }
        return;
      }

      setLocalOffline(false);
      setLocalSynced(false);
      if (orderId) {
        const data = await api.getOrderById(orderId);
        setOrder(data);
      } else {
        const orders = await api.getOrders();
        setOrder(orders.length > 0 ? orders[0] : null);
      }
    } catch (err: any) {
      // Repli hors-ligne : serveur injoignable, on cherche la commande locale.
      if (orderId) {
        const local = await getLocalOrder(orderId);
        if (local) {
          setOrder(local);
          setLocalOffline(true);
          setLocalSynced(local.synced);
          setError(null);
          return;
        }
      }
      setError(err.message || 'Impossible de récupérer les détails du suivi de commande.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrder();
  }, [fetchOrder]);

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#111" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Suivi de commande</Text>
      <TouchableOpacity onPress={() => router.push('/(tabs)')}>
        <Ionicons name="home-outline" size={22} color="#111" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {header}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Chargement du suivi en direct...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {header}
        <ServerOfflineView onRetry={fetchOrder} message={error} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {header}
        <View style={styles.centerContainer}>
          <Ionicons name="cube-outline" size={60} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Aucune commande trouvée</Text>
          <Text style={styles.emptySubtitle}>
            Vous n’avez pas encore passé de commande ou la référence est introuvable.
          </Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { marginTop: 20, paddingHorizontal: 24 }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.btnPrimaryText}>Découvrir nos produits</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const st = normalizeStatus(order.status);
  const meta = STATUS_META[st];
  const idx = statusIndex(st);
  const cancelled = st === 'cancelled';
  const mode = getDeliveryMode(order.deliveryMode);
  const invoiceId = order.invoiceId ?? order.invoices?.[0]?.id;
  const sellerGroups = order.sellerOrders ?? [];

  const formattedOrderDate = new Date(order.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const startDays = mode.id === 'express' ? 1 : 2;
  const endDays = mode.id === 'express' ? 2 : 5;
  const estimatedStart = new Date(order.createdAt + startDays * 86400000).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
  const estimatedEnd = new Date(order.createdAt + endDays * 86400000).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });

  const steps = [
    { title: 'Commande confirmée', desc: formattedOrderDate },
    {
      title: 'Paiement validé',
      desc: localOffline ? 'Paiement simulé localement (hors-ligne)' : 'Paiement sécurisé par carte bancaire',
    },
    {
      title: 'Colis expédié',
      desc: idx >= 2 ? 'Colis confié au transporteur partenaire.' : 'Préparation et emballage soigné de vos articles.',
    },
    {
      title: st === 'delivered' ? 'Livraison effectuée' : 'Livraison finale',
      desc: st === 'delivered' ? 'Remis en mains propres.' : `Prévu entre ${estimatedStart} et ${estimatedEnd}`,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {header}

        {/* RESUME COMMANDE */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {st === 'delivered' ? 'Commande livrée' : cancelled ? 'Commande annulée' : 'Commande en cours'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon as any} size={12} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>

          <Text style={styles.orderNumber}>
            N°{' '}
            {order.id.startsWith('off-')
              ? `ELN-LOCAL-${order.id.slice(-6).toUpperCase()}`
              : order.id.replace('cmd-', 'ELN-').slice(0, 16).toUpperCase()}
          </Text>

          <View style={styles.summaryBottom}>
            <Text style={styles.totalText}>{formatPrice(order.total)}</Text>
            <Text style={styles.totalSub}>TVA incluse</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name={mode.icon as any} size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              {mode.label} ({mode.delay})
              {order.shippingCost ? ` · ${formatPrice(order.shippingCost)}` : ' · Gratuit'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name={localOffline ? 'cloud-offline-outline' : 'card-outline'} size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              {cancelled
                ? 'Paiement remboursé sous 3 à 5 jours'
                : localOffline
                ? 'Paiement simulé localement (hors-ligne)'
                : 'Payé par carte bancaire via Stripe'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              {st === 'delivered'
                ? 'Livraison effectuée'
                : cancelled
                ? 'Commande annulée'
                : `Livraison estimée : ${estimatedStart} - ${estimatedEnd}`}
            </Text>
          </View>
        </View>

        {/* BANDEAU HORS-LIGNE / SYNCHRONISATION */}
        {localOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons
              name={localSynced ? 'cloud-done-outline' : 'cloud-offline-outline'}
              size={22}
              color="#B45309"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.offlineTitle}>
                {localSynced ? 'Commande synchronisée' : 'Commande hors-ligne'}
              </Text>
              <Text style={styles.offlineText}>
                {localSynced
                  ? 'Enregistrée localement puis synchronisée avec la base en ligne.'
                  : 'Paiement simulé · en attente de synchronisation avec le serveur dès le retour en ligne.'}
              </Text>
            </View>
          </View>
        )}

        {/* BANDEAU ANNULATION */}
        {cancelled && (
          <View style={styles.cancelBanner}>
            <Ionicons name="close-circle" size={22} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelTitle}>Commande annulée</Text>
              <Text style={styles.cancelText}>
                Cette commande a été annulée. Les articles ont été remis en stock et le paiement
                sera remboursé sous 3 à 5 jours ouvrés.
              </Text>
            </View>
          </View>
        )}

        {/* HISTORIQUE D'AVANCEMENT */}
        {!cancelled && (
          <>
            <Text style={styles.sectionTitle}>Historique d’avancement</Text>
            <View style={styles.timelineCard}>
              {steps.map((step, i) => {
                const achieved = idx >= i;
                const isCurrent = i === idx;
                const dotStyle = !achieved
                  ? styles.dotPending
                  : isCurrent && st !== 'delivered'
                  ? styles.dotActive
                  : styles.dotDone;
                return (
                  <React.Fragment key={i}>
                    {i > 0 && <View style={styles.timelineLine} />}
                    <View style={styles.timelineItem}>
                      <View style={[styles.timelineDot, dotStyle]}>
                        {achieved ? (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        ) : (
                          <Text style={styles.dotNum}>{i + 1}</Text>
                        )}
                      </View>
                      <View style={styles.timelineContent}>
                        <Text
                          style={[
                            styles.timelineTitle,
                            isCurrent && { color: st === 'delivered' ? '#059669' : '#2563EB' },
                            !achieved && { color: '#9CA3AF' },
                          ]}
                        >
                          {step.title}
                        </Text>
                        <Text style={styles.timelineDate}>{step.desc}</Text>
                      </View>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </>
        )}

        {/* ARTICLES COMMANDÉS */}
        <Text style={styles.sectionTitle}>
          Articles commandés ({order.items.reduce((sum, item) => sum + item.quantity, 0)})
        </Text>

        {sellerGroups.length > 0 ? (
          sellerGroups.map((group) => {
            const groupMeta = STATUS_META[normalizeStatus(group.status)];
            return (
              <View key={group.id} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupSellerIcon}>
                    <Ionicons name="storefront-outline" size={14} color="#2563EB" />
                  </View>
                  <Text style={styles.groupSellerName} numberOfLines={1}>
                    {group.seller?.shopName || 'Boutique Élan'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: groupMeta.bg }]}>
                    <Text style={[styles.statusText, { color: groupMeta.color }]}>
                      {groupMeta.label}
                    </Text>
                  </View>
                </View>

                {group.items.map((item, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <View style={styles.divider} />}
                    <View style={styles.productRow}>
                      <View style={styles.productIconContainer}>
                        <Ionicons name="cube-outline" size={20} color="#2563EB" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.productDesc}>
                          Quantité : {item.quantity} × {formatPrice(item.price)}
                        </Text>
                      </View>
                      <Text style={styles.productPrice}>
                        {formatPrice(item.price * item.quantity)}
                      </Text>
                    </View>
                  </React.Fragment>
                ))}

                <View style={styles.groupTotals}>
                  <View style={styles.groupTotalRow}>
                    <Text style={styles.groupTotalLabel}>Sous-total</Text>
                    <Text style={styles.groupTotalValue}>{formatPrice(group.subtotal)}</Text>
                  </View>
                  {group.discount > 0 && (
                    <View style={styles.groupTotalRow}>
                      <Text style={styles.groupTotalLabel}>Remise</Text>
                      <Text style={styles.groupDiscount}>−{formatPrice(group.discount)}</Text>
                    </View>
                  )}
                  <View style={styles.groupTotalRow}>
                    <Text style={styles.groupTotalLabel}>Livraison</Text>
                    <Text style={styles.groupTotalValue}>
                      {group.shippingShare > 0 ? formatPrice(group.shippingShare) : 'Gratuite'}
                    </Text>
                  </View>
                  <View style={[styles.groupTotalRow, styles.groupGrandRow]}>
                    <Text style={styles.groupGrandLabel}>Total boutique</Text>
                    <Text style={styles.groupGrandValue}>{formatPrice(group.total)}</Text>
                  </View>
                </View>

                {group.invoiceId && (
                  <TouchableOpacity
                    style={styles.groupInvoiceBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/facture/[id]',
                        params: { id: group.invoiceId! },
                      })
                    }>
                    <Ionicons name="document-text-outline" size={14} color="#2563EB" />
                    <Text style={styles.groupInvoiceText}>Facture de la boutique</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.articlesCard}>
            {order.items.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.productRow}>
                  <View style={styles.productIconContainer}>
                    <Ionicons name="cube-outline" size={20} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.productDesc}>
                      Quantité : {item.quantity} × {formatPrice(item.price)}
                    </Text>
                  </View>
                  <Text style={styles.productPrice}>{formatPrice(item.price * item.quantity)}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        <View style={styles.articlesCard}>
          <View style={styles.deliveryRow}>
            <Ionicons name="location-outline" size={18} color="#6B7280" />
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text style={styles.deliveryTitle}>Adresse de livraison</Text>
              <Text style={styles.deliveryText}>
                {order.shippingAddress || 'Adresse non renseignée'}
              </Text>
            </View>
          </View>
        </View>

        {/* ACTIONS */}
        {invoiceId && (
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push({ pathname: '/facture/[id]', params: { id: invoiceId } })}
          >
            <Ionicons name="document-text-outline" size={18} color="#2563EB" />
            <Text style={styles.btnSecondaryText}>Voir la facture</Text>
          </TouchableOpacity>
        )}

        {st === 'delivered' && (
          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/avis')}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>Laisser un avis sur la commande</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/(tabs)')}>
          <Ionicons name="storefront-outline" size={18} color="#2563EB" />
          <Text style={styles.btnSecondaryText}>Retourner à la boutique</Text>
        </TouchableOpacity>

        {/* FOOTER ASSISTANCE */}
        <View style={styles.helpFooter}>
          <Text style={styles.helpText}>Une question sur cette commande ? </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profil')}>
            <Text style={styles.helpLink}>Contactez le support client</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, maxWidth: 560, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },

  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 13, color: '#6B7280' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginTop: 16, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center' },

  summaryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  summaryLabel: { fontSize: 12, color: '#6B7280' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '600' },
  orderNumber: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 10 },
  summaryBottom: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 },
  totalText: { fontSize: 22, fontWeight: '800', color: '#111' },
  totalSub: { fontSize: 11, color: '#6B7280' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 11, color: '#374151', flex: 1 },

  cancelBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  cancelTitle: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  cancelText: { fontSize: 11.5, color: '#B91C1C', marginTop: 2, lineHeight: 16 },

  offlineBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  offlineTitle: { fontSize: 13, fontWeight: '700', color: '#9A3412' },
  offlineText: { fontSize: 11.5, color: '#B45309', marginTop: 2, lineHeight: 16 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 10, marginTop: 8 },
  timelineCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  dotDone: { backgroundColor: '#10B981' },
  dotActive: { backgroundColor: '#2563EB' },
  dotPending: { backgroundColor: '#E5E7EB' },
  dotNum: { fontSize: 9, color: '#6B7280', fontWeight: '700' },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 13, fontWeight: '600', color: '#111' },
  timelineDate: { fontSize: 11, color: '#6B7280', marginTop: 2, lineHeight: 15 },
  timelineLine: { width: 2, height: 22, backgroundColor: '#E5E7EB', marginLeft: 10, marginVertical: 2 },

  articlesCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  productRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  productIconContainer: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  productName: { fontSize: 13, fontWeight: '600', color: '#111' },
  productDesc: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  productPrice: { fontSize: 13, fontWeight: '700', color: '#111' },
  deliveryRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  deliveryTitle: { fontSize: 12, fontWeight: '600', color: '#111', marginBottom: 2 },
  deliveryText: { fontSize: 11, color: '#6B7280' },

  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  groupSellerIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupSellerName: { flex: 1, fontSize: 12.5, fontWeight: '700', color: '#111' },
  groupTotals: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 4,
  },
  groupTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupTotalLabel: { fontSize: 11, color: '#6B7280' },
  groupTotalValue: { fontSize: 11, fontWeight: '600', color: '#111' },
  groupDiscount: { fontSize: 11, fontWeight: '600', color: '#059669' },
  groupGrandRow: { marginTop: 4 },
  groupGrandLabel: { fontSize: 12, fontWeight: '700', color: '#111' },
  groupGrandValue: { fontSize: 14, fontWeight: '800', color: '#111' },
  groupInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  groupInvoiceText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },

  btnPrimary: {
    flexDirection: 'row', backgroundColor: '#2563EB', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10,
    shadowColor: '#2563EB', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnSecondary: { flexDirection: 'row', backgroundColor: '#EFF6FF', borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  btnSecondaryText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },

  helpFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  helpText: { fontSize: 12, color: '#6B7280' },
  helpLink: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
});