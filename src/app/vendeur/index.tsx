import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSellerDashboard } from '@/context/SellerContext';
import { formatPrice } from '@/lib/format';
import { normalizeStatus, STATUS_META } from '@/lib/orderStatus';
import { resolveMediaUrl } from '@/services/api';

export default function SellerDashboardScreen() {
  const { user, seller } = useAuth();
  const { dashboard, loading, error, refresh } = useSellerDashboard();

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement de votre espace…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const maxRevenue = Math.max(1, ...(dashboard?.salesByDay.map((day) => day.revenue) ?? [0]));
  const firstName = user?.name?.split(' ')[0] ?? 'Vendeur';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View style={styles.shopIdentity}>
            <View style={styles.avatar}>
              {seller?.avatarUrl ? (
                <Image
                  source={{ uri: resolveMediaUrl(seller.avatarUrl) }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{seller?.shopName?.charAt(0) ?? 'É'}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>ESPACE VENDEUR</Text>
              <Text style={styles.shopName} numberOfLines={1}>
                {seller?.shopName ?? 'Ma boutique'}
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push('/vendeur/boutique')}
            accessibilityLabel="Paramètres boutique">
            <Ionicons name="settings-outline" size={19} color={colors.ink} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />
          }>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.roseInk} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.heroCard}>
            <Text style={styles.heroGreeting}>Bonjour {firstName} 👋</Text>
            <Text style={styles.heroLabel}>Chiffre d’affaires du jour</Text>
            <Text style={styles.heroRevenue}>{formatPrice(dashboard?.revenueToday ?? 0)}</Text>
            <View style={styles.heroRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>30 jours</Text>
                <Text style={styles.heroStatValue}>{formatPrice(dashboard?.revenue30d ?? 0)}</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Total</Text>
                <Text style={styles.heroStatValue}>{formatPrice(dashboard?.revenueAll ?? 0)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <Pressable style={styles.kpiCard} onPress={() => router.push('/vendeur/commandes')}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="receipt-outline" size={17} color={colors.primary} />
              </View>
              <Text style={styles.kpiValue}>{dashboard?.pendingOrders ?? 0}</Text>
              <Text style={styles.kpiLabel}>À traiter</Text>
            </Pressable>
            <Pressable style={styles.kpiCard} onPress={() => router.push('/vendeur/produits')}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.amberSoft }]}>
                <Ionicons name="alert-circle-outline" size={17} color={colors.amberInk} />
              </View>
              <Text style={styles.kpiValue}>
                {(dashboard?.lowStockProducts ?? 0) + (dashboard?.outOfStockProducts ?? 0)}
              </Text>
              <Text style={styles.kpiLabel}>Stocks à surveiller</Text>
            </Pressable>
            <Pressable style={styles.kpiCard} onPress={() => router.push('/vendeur/produits')}>
              <View style={[styles.kpiIcon, { backgroundColor: colors.mint }]}>
                <Ionicons name="cube-outline" size={17} color={colors.mintInk} />
              </View>
              <Text style={styles.kpiValue}>{dashboard?.onlineProducts ?? 0}</Text>
              <Text style={styles.kpiLabel}>En ligne</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Ventes des 14 derniers jours</Text>
              <Text style={styles.cardHint}>{formatPrice(dashboard?.revenue30d ?? 0)} sur 30 j</Text>
            </View>
            <View style={styles.chart}>
              {(dashboard?.salesByDay ?? []).map((day) => {
                const height = Math.max(4, Math.round((day.revenue / maxRevenue) * 96));
                return (
                  <View key={day.date} style={styles.chartColumn}>
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBar,
                          { height, backgroundColor: day.revenue > 0 ? colors.primary : colors.line },
                        ]}
                      />
                    </View>
                    <Text style={styles.chartLabel}>{day.date.slice(8, 10)}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Dernières commandes</Text>
              <Pressable onPress={() => router.push('/vendeur/commandes')}>
                <Text style={styles.cardLink}>Tout voir</Text>
              </Pressable>
            </View>
            {(dashboard?.recentOrders ?? []).length === 0 ? (
              <Text style={styles.emptyText}>Aucune commande pour le moment.</Text>
            ) : (
              dashboard?.recentOrders.map((order) => {
                const meta = STATUS_META[normalizeStatus(order.status)];
                return (
                  <View key={order.id} style={styles.orderRow}>
                    <View style={styles.orderIcon}>
                      <Ionicons name="bag-handle-outline" size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderBuyer} numberOfLines={1}>
                        {order.buyer?.name || 'Client'}
                      </Text>
                      <Text style={styles.orderMeta}>
                        {order.items.length} article{order.items.length > 1 ? 's' : ''} ·{' '}
                        {new Date(order.orderCreatedAt).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.orderTotal}>{formatPrice(order.total)}</Text>
                      <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <Text style={styles.sectionLabel}>Actions rapides</Text>
          <View style={styles.actionsGrid}>
            <QuickAction
              icon="add-circle-outline"
              label="Ajouter un produit"
              tint={colors.primarySoft}
              color={colors.primary}
              onPress={() => router.push({ pathname: '/vendeur/produits', params: { create: '1' } })}
            />
            <QuickAction
              icon="pricetags-outline"
              label="Codes promo"
              tint={colors.amberSoft}
              color={colors.amberInk}
              onPress={() => router.push('/vendeur/finances')}
            />
            <QuickAction
              icon="star-outline"
              label="Avis clients"
              tint={colors.roseSoft}
              color={colors.roseInk}
              onPress={() => router.push('/vendeur/boutique')}
            />
            <QuickAction
              icon="color-palette-outline"
              label="Ma vitrine"
              tint={colors.mint}
              color={colors.mintInk}
              onPress={() => router.push('/vendeur/boutique')}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  tint,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: fonts.medium, fontSize: 12.5, color: colors.muted },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  shopIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.surface },
  avatarImage: { width: '100%', height: '100%' },
  eyebrow: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1, color: colors.muted },
  shopName: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.roseSoft,
    borderRadius: radius.md,
    padding: 11,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontFamily: fonts.medium, fontSize: 11.5, color: colors.roseInk },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 18,
    ...shadow.card,
  },
  heroGreeting: { fontFamily: fonts.semibold, fontSize: 12.5, color: 'rgba(255,255,255,0.82)' },
  heroLabel: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 12,
  },
  heroRevenue: { fontFamily: fonts.extrabold, fontSize: 30, color: colors.surface, marginTop: 2 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  heroStat: { flex: 1 },
  heroStatLabel: { fontFamily: fonts.medium, fontSize: 10.5, color: 'rgba(255,255,255,0.7)' },
  heroStatValue: { fontFamily: fonts.bold, fontSize: 14, color: colors.surface, marginTop: 1 },
  heroDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.24)', marginHorizontal: 14 },
  kpiRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    ...shadow.soft,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: { fontFamily: fonts.extrabold, fontSize: 19, color: colors.ink },
  kpiLabel: { fontFamily: fonts.medium, fontSize: 9.8, lineHeight: 13, color: colors.muted, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 14,
    ...shadow.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  cardHint: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted },
  cardLink: { fontFamily: fonts.bold, fontSize: 11, color: colors.primary },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 128 },
  chartColumn: { flex: 1, alignItems: 'center', gap: 4 },
  chartBarTrack: { height: 100, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  chartBar: { width: '70%', borderRadius: 4 },
  chartLabel: { fontFamily: fonts.medium, fontSize: 8, color: colors.muted },
  emptyText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.muted, textAlign: 'center', paddingVertical: 12 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  orderIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBuyer: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  orderMeta: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted, marginTop: 1 },
  orderTotal: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1, marginTop: 3 },
  statusText: { fontFamily: fonts.bold, fontSize: 8.5 },
  sectionLabel: {
    fontFamily: fonts.extrabold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 20,
    marginBottom: 10,
  },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: {
    width: '47.8%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    ...shadow.soft,
  },
  quickIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 11, color: colors.ink },
});
