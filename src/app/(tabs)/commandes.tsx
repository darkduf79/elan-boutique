import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ServerOfflineView } from '@/components/ServerOfflineView';
import { colors, fonts, radius, shadow } from '@/constants/theme';
import { formatPrice } from '@/lib/format';
import { normalizeStatus, STATUS_META } from '@/lib/orderStatus';
import { api, type ApiOrder } from '@/services/api';
import { getLocalOrders } from '@/services/localDb';

type OrderView = ApiOrder & { offline?: boolean; synced?: boolean; syncError?: string };

export default function OrdersScreen() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const fetchOrders = useCallback(async () => {
    const local = await getLocalOrders();
    try {
      setError(null);
      const server = await api.getOrders();
      // Fusion : base en ligne + commandes locales non encore synchronisées.
      const unsynced = local.filter((o) => !o.synced);
      const merged: OrderView[] = [...server, ...unsynced].sort((a, b) => b.createdAt - a.createdAt);
      setOrders(merged);
      setOffline(false);
    } catch {
      // Hors-ligne : la base locale prend le relais.
      setOrders(local);
      setOffline(true);
      setError(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const renderOrderItem = ({ item }: { item: OrderView }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const meta = STATUS_META[normalizeStatus(item.status)];
    const isLocal = item.id.startsWith('off-');
    const ref = item.id.replace('cmd-', '').replace('off-', '').slice(-6).toUpperCase();

    return (
      <Pressable
        style={styles.orderCard}
        onPress={() => router.push({ pathname: '/suivi', params: { orderId: item.id } })}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>COMMANDE #{ref}</Text>
            <Text style={styles.orderDate}>{formattedDate}</Text>
          </View>
          <View style={styles.badgeColumn}>
            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon as any} size={12} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {isLocal && (
              <View style={styles.localBadge}>
                <Ionicons
                  name={item.synced ? 'cloud-done-outline' : 'cloud-offline-outline'}
                  size={10}
                  color="#B45309"
                />
                <Text style={styles.localBadgeText}>
                  {item.synced ? 'Synchronisée' : 'Hors-ligne'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {isLocal && item.syncError ? (
          <Text style={styles.syncError}>Synchronisation en échec : {item.syncError}</Text>
        ) : null}

        {item.sellerOrders && item.sellerOrders.length > 0 ? (
          <View style={styles.groups}>
            {item.sellerOrders.map((group) => {
              const groupMeta = STATUS_META[normalizeStatus(group.status)];
              return (
                <View key={group.id} style={styles.groupCard}>
                  <View style={styles.groupHeader}>
                    <Ionicons name="storefront-outline" size={12} color={colors.primary} />
                    <Text style={styles.groupSeller} numberOfLines={1}>
                      {group.seller?.shopName || 'Boutique Élan'}
                    </Text>
                    <View style={[styles.groupBadge, { backgroundColor: groupMeta.bg }]}>
                      <Text style={[styles.groupBadgeText, { color: groupMeta.color }]}>
                        {groupMeta.label}
                      </Text>
                    </View>
                  </View>
                  {group.items.map((it, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemQuantity}>{it.quantity}×</Text>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {it.title}
                      </Text>
                      <Text style={styles.itemPrice}>{formatPrice(it.price * it.quantity)}</Text>
                    </View>
                  ))}
                  <View style={styles.groupFooter}>
                    <Text style={styles.groupTotalLabel}>Sous-total boutique</Text>
                    <Text style={styles.groupTotal}>{formatPrice(group.total)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.itemsList}>
            {item.items.map((it, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemQuantity}>{it.quantity}×</Text>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {it.title}
                </Text>
                <Text style={styles.itemPrice}>{formatPrice(it.price * it.quantity)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.totalLabel}>Total TTC</Text>
            <Text style={styles.totalValue}>{formatPrice(item.total)}</Text>
          </View>
          <View style={styles.trackAction}>
            <Text style={styles.trackActionText}>Suivre la commande</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ÉLAN BOUTIQUE</Text>
          <Text style={styles.heading}>Mes commandes</Text>
        </View>

        {offline && (
          <View style={styles.offlineNote}>
            <Ionicons name="cloud-offline-outline" size={16} color="#B45309" />
            <Text style={styles.offlineNoteText}>
              Base hors-ligne · vos commandes locales. Synchronisation dès le retour en ligne.
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement des commandes...</Text>
          </View>
        ) : error && orders.length === 0 ? (
          <ServerOfflineView onRetry={fetchOrders} message={error} />
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            renderItem={renderOrderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="receipt-outline" size={32} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Aucune commande</Text>
                <Text style={styles.emptyText}>
                  Vos commandes et leur suivi apparaîtront ici après votre premier achat.
                </Text>
                <Pressable style={styles.button} onPress={() => router.push('/(tabs)')}>
                  <Text style={styles.buttonText}>Faire mes achats</Text>
                </Pressable>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 9.5,
    letterSpacing: 1.1,
    color: colors.muted,
    marginBottom: 1,
  },
  heading: {
    fontFamily: fonts.extrabold,
    fontSize: 20,
    lineHeight: 24,
    color: colors.ink,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
  },
  listContent: {
    padding: 16,
    paddingBottom: 96,
    gap: 12,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    ...shadow.soft,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  orderId: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.ink,
    letterSpacing: 0.5,
  },
  orderDate: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeColumn: { alignItems: 'flex-end', gap: 5 },
  localBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: '#FFEDD5',
  },
  localBadgeText: { fontFamily: fonts.bold, fontSize: 9, color: '#B45309' },
  syncError: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.roseInk, marginTop: 8 },
  offlineNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  offlineNoteText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 15,
    color: '#9A3412',
  },
  statusSuccess: { backgroundColor: colors.mint },
  statusPending: { backgroundColor: colors.amberSoft },
  statusText: { fontFamily: fonts.bold, fontSize: 10.5 },
  statusTextSuccess: { color: colors.mintInk },
  statusTextPending: { color: colors.amberInk },
  itemsList: {
    paddingVertical: 12,
    gap: 6,
  },
  groups: { paddingVertical: 10, gap: 8 },
  groupCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: 10,
    gap: 6,
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  groupSeller: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: colors.ink,
  },
  groupBadge: { borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  groupBadgeText: { fontFamily: fonts.bold, fontSize: 9 },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  groupTotalLabel: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.muted },
  groupTotal: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.ink },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemQuantity: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primary,
    width: 22,
  },
  itemTitle: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.inkSoft,
  },
  itemPrice: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.ink,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  totalLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.inkSoft,
  },
  totalValue: {
    fontFamily: fonts.extrabold,
    fontSize: 15,
    color: colors.ink,
  },
  trackAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  trackActionText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: colors.primary,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.extrabold,
    fontSize: 17,
    color: colors.ink,
    marginTop: 16,
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  button: {
    marginTop: 18,
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.surface,
  },
});
