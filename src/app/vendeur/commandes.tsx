import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, shadow } from '@/constants/theme';
import { useSellerDashboard } from '@/context/SellerContext';
import { formatPrice } from '@/lib/format';
import { normalizeStatus, STATUS_META, type OrderStatus } from '@/lib/orderStatus';
import { api, type ApiSellerOrder } from '@/services/api';

type Filter = 'all' | OrderStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'pending', label: 'À traiter' },
  { id: 'paid', label: 'Payées' },
  { id: 'shipped', label: 'Expédiées' },
  { id: 'delivered', label: 'Livrées' },
  { id: 'cancelled', label: 'Annulées' },
];

export default function SellerOrdersScreen() {
  const { refresh: refreshDashboard } = useSellerDashboard();

  const [orders, setOrders] = useState<ApiSellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getSellerOrders();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les commandes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const visible = useMemo(
    () =>
      filter === 'all'
        ? orders
        : orders.filter((order) => normalizeStatus(order.status) === filter),
    [orders, filter],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: orders.length };
    for (const order of orders) {
      const status = normalizeStatus(order.status);
      map[status] = (map[status] ?? 0) + 1;
    }
    return map;
  }, [orders]);

  const changeStatus = async (order: ApiSellerOrder, status: OrderStatus) => {
    try {
      setUpdatingId(order.id);
      await api.updateOrderStatus(order.orderId, status, order.id);
      await Promise.all([load(), refreshDashboard()]);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Mise à jour impossible.');
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmCancel = (order: ApiSellerOrder) => {
    Alert.alert(
      'Annuler la commande',
      'Les articles seront remis en stock et le client sera remboursé. Confirmer ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler la commande',
          style: 'destructive',
          onPress: () => changeStatus(order, 'cancelled'),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>VENTES</Text>
            <Text style={styles.heading}>Commandes</Text>
          </View>
          <View style={styles.pendingPill}>
            <Text style={styles.pendingCount}>{counts.pending ?? 0}</Text>
            <Text style={styles.pendingLabel}>à traiter</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersRow}>
          {FILTERS.map((option) => {
            const active = filter === option.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(option.id)}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {option.label}
                </Text>
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                    {counts[option.id] ?? 0}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                tintColor={colors.primary}
              />
            }>
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.roseInk} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {visible.length === 0 && !error ? (
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={34} color={colors.primary} />
                <Text style={styles.emptyTitle}>Aucune commande</Text>
                <Text style={styles.emptyText}>
                  Les commandes contenant vos produits apparaîtront ici.
                </Text>
              </View>
            ) : (
              visible.map((order) => {
                const status = normalizeStatus(order.status);
                const meta = STATUS_META[status];
                const busy = updatingId === order.id;
                return (
                  <View key={order.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderRef}>
                          #{order.orderId.replace('cmd-', '').slice(-6).toUpperCase()}
                        </Text>
                        <Text style={styles.orderDate}>
                          {new Date(order.orderCreatedAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                        <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>

                    <View style={styles.buyerRow}>
                      <View style={styles.buyerAvatar}>
                        <Text style={styles.buyerInitial}>
                          {(order.buyer?.name || 'C').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.buyerName}>{order.buyer?.name || 'Client Élan'}</Text>
                        <Text style={styles.buyerEmail}>{order.buyer?.email || '—'}</Text>
                      </View>
                      <View style={styles.deliveryPill}>
                        <Ionicons
                          name={order.deliveryMode === 'express' ? 'flash-outline' : 'cube-outline'}
                          size={11}
                          color={colors.primary}
                        />
                        <Text style={styles.deliveryText}>
                          {order.deliveryMode === 'express' ? 'Express' : 'Standard'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.itemsList}>
                      {order.items.map((item) => (
                        <View key={item.id ?? item.productId} style={styles.itemRow}>
                          <Text style={styles.itemQty}>{item.quantity}×</Text>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.itemPrice}>
                            {formatPrice(item.price * item.quantity)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.totalsBlock}>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Sous-total</Text>
                        <Text style={styles.totalValue}>{formatPrice(order.subtotal)}</Text>
                      </View>
                      {order.discount > 0 && (
                        <View style={styles.totalRow}>
                          <Text style={styles.totalLabel}>Remise</Text>
                          <Text style={styles.discountValue}>−{formatPrice(order.discount)}</Text>
                        </View>
                      )}
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Livraison</Text>
                        <Text style={styles.totalValue}>
                          {order.shippingShare > 0 ? formatPrice(order.shippingShare) : 'Offerte'}
                        </Text>
                      </View>
                      <View style={[styles.totalRow, styles.grandRow]}>
                        <Text style={styles.grandLabel}>Total boutique</Text>
                        <Text style={styles.grandValue}>{formatPrice(order.total)}</Text>
                      </View>
                    </View>

                    {order.shippingAddress ? (
                      <View style={styles.addressRow}>
                        <Ionicons name="location-outline" size={13} color={colors.muted} />
                        <Text style={styles.addressText}>{order.shippingAddress}</Text>
                      </View>
                    ) : null}

                    <View style={styles.actionsRow}>
                      {order.invoiceId ? (
                        <Pressable
                          style={styles.secondaryAction}
                          onPress={() =>
                            router.push({
                              pathname: '/facture/[id]',
                              params: { id: order.invoiceId! },
                            })
                          }>
                          <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                          <Text style={styles.secondaryActionText}>Facture</Text>
                        </Pressable>
                      ) : null}

                      {busy ? (
                        <View style={styles.busyPill}>
                          <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                      ) : (
                        <>
                          {status === 'pending' && (
                            <Pressable
                              style={styles.primaryAction}
                              onPress={() => changeStatus(order, 'paid')}>
                              <Text style={styles.primaryActionText}>Marquer payée</Text>
                            </Pressable>
                          )}
                          {status === 'paid' && (
                            <Pressable
                              style={styles.primaryAction}
                              onPress={() => changeStatus(order, 'shipped')}>
                              <Ionicons name="cube-outline" size={14} color={colors.surface} />
                              <Text style={styles.primaryActionText}>Expédier</Text>
                            </Pressable>
                          )}
                          {status === 'shipped' && (
                            <Pressable
                              style={styles.primaryAction}
                              onPress={() => changeStatus(order, 'delivered')}>
                              <Ionicons name="checkmark" size={14} color={colors.surface} />
                              <Text style={styles.primaryActionText}>Marquer livrée</Text>
                            </Pressable>
                          )}
                          {(status === 'pending' || status === 'paid') && (
                            <Pressable style={styles.cancelAction} onPress={() => confirmCancel(order)}>
                              <Ionicons name="close" size={14} color={colors.roseInk} />
                            </Pressable>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  eyebrow: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1, color: colors.muted },
  heading: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.amberSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  pendingCount: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.amberInk },
  pendingLabel: { fontFamily: fonts.semibold, fontSize: 10, color: colors.amberInk },
  // Un ScrollView horizontal dans une colonne flex s'étire en hauteur :
  // on lui rend sa hauteur naturelle et on centre les chips verticalement.
  filtersScroll: { flexGrow: 0, flexShrink: 0 },
  filtersRow: { gap: 8, paddingHorizontal: 16, paddingBottom: 12, alignItems: 'center' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.inkSoft },
  filterTextActive: { color: colors.surface },
  filterCount: { backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 5, paddingVertical: 1 },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  filterCountText: { fontFamily: fonts.bold, fontSize: 9, color: colors.muted },
  filterCountTextActive: { color: colors.surface },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.roseSoft,
    borderRadius: radius.md,
    padding: 11,
  },
  errorText: { flex: 1, fontFamily: fonts.medium, fontSize: 11.5, color: colors.roseInk },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 60 },
  emptyTitle: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  emptyText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    ...shadow.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  orderRef: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.ink, letterSpacing: 0.4 },
  orderDate: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted, marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: { fontFamily: fonts.bold, fontSize: 9.5 },
  buyerRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10 },
  buyerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerInitial: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.primary },
  buyerName: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  buyerEmail: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted, marginTop: 1 },
  deliveryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deliveryText: { fontFamily: fonts.bold, fontSize: 9.5, color: colors.primary },
  itemsList: { gap: 6, paddingVertical: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemQty: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.primary, width: 22 },
  itemTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 11.5, color: colors.inkSoft },
  itemPrice: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.ink },
  totalsBlock: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 4,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.muted },
  totalValue: { fontFamily: fonts.semibold, fontSize: 10.5, color: colors.ink },
  discountValue: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.mintInk },
  grandRow: { marginTop: 4 },
  grandLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  grandValue: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 9 },
  addressText: { flex: 1, fontFamily: fonts.medium, fontSize: 10.5, lineHeight: 15, color: colors.muted },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 11,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  secondaryActionText: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.primary },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 13,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryActionText: { fontFamily: fonts.bold, fontSize: 11, color: colors.surface },
  cancelAction: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyPill: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
