import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { ServerOfflineView } from '@/components/ServerOfflineView';
import { colors, fonts, radius, shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import {
  api,
  apiProductToClientProduct,
  type ApiProduct,
} from '@/services/api';

export default function FavorisScreen() {
  const { isAuthenticated } = useAuth();
  const { wishlist, toggleWishlist, cart, addToCart, refreshFavorites } = useCart();

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setProducts([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const [favorites] = await Promise.all([api.getFavorites(), refreshFavorites()]);
      setProducts(favorites);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger vos favoris.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, refreshFavorites]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Retire immédiatement une carte lorsque le cœur est décoché.
  const visible = products.filter((product) => wishlist.includes(product.id));

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.page}>
          <ScreenHeader />
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart-outline" size={30} color={colors.roseInk} />
            </View>
            <Text style={styles.emptyTitle}>Vos favoris vous attendent</Text>
            <Text style={styles.emptyText}>
              Connectez-vous pour retrouver vos coups de cœur sur tous vos appareils.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push('/(tabs)/profil')}>
              <Text style={styles.primaryButtonText}>Se connecter</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.page}>
          <ScreenHeader />
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <ScreenHeader count={visible.length} />
        {error ? (
          <ServerOfflineView
            title="Favoris indisponibles"
            message={error}
            onRetry={load}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
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
            {visible.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="heart-outline" size={30} color={colors.roseInk} />
                </View>
                <Text style={styles.emptyTitle}>Aucun favori pour l’instant</Text>
                <Text style={styles.emptyText}>
                  Touchez le cœur sur un produit pour le retrouver ici.
                </Text>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => router.push('/(tabs)')}>
                  <Text style={styles.primaryButtonText}>Découvrir la boutique</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.grid}>
                {visible.map((apiProduct) => {
                  const product = apiProductToClientProduct(apiProduct);
                  return (
                    <View key={product.id} style={styles.gridItem}>
                      <ProductCard
                        product={product}
                        wishlisted
                        quantityInCart={cart[product.id] ?? 0}
                        onToggleWishlist={toggleWishlist}
                        onAdd={(item) => addToCart(item)}
                        onPress={(item) => router.push(`/produit/${item.id}`)}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function ScreenHeader({ count }: { count?: number }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={colors.ink} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.eyebrow}>ÉLAN BOUTIQUE</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Mes favoris</Text>
          {typeof count === 'number' && count > 0 && (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  headerText: { flex: 1, marginLeft: 12 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1, color: colors.muted },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.extrabold, fontSize: 19, color: colors.ink },
  countPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  countText: { fontFamily: fonts.bold, fontSize: 11, color: colors.primary },
  headerSpacer: { width: 38 },
  scroll: { paddingBottom: 40, paddingTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  gridItem: { width: '47.5%' },
  emptyState: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 60, gap: 10 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink, textAlign: 'center' },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.muted,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  primaryButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.surface },
});
