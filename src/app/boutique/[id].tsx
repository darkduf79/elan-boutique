import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { ProductCard } from '@/components/ProductCard';
import { ServerOfflineView } from '@/components/ServerOfflineView';
import { colors, fonts, radius, shadow } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import {
  api,
  apiProductToClientProduct,
  resolveMediaUrl,
  type ApiProduct,
  type ApiReview,
  type ApiSellerPublic,
} from '@/services/api';

export default function BoutiqueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { wishlist, toggleWishlist, cart, addToCart } = useCart();

  const [seller, setSeller] = useState<ApiSellerPublic | null>(null);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [sellerData, productData, reviewData] = await Promise.all([
        api.getSeller(id),
        api.getSellerPublicProducts(id),
        api.getReviews({ sellerId: id }).catch(() => []),
      ]);
      setSeller(sellerData);
      setProducts(productData);
      setReviews(reviewData);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger cette boutique.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))),
    [products],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Ouverture de la boutique…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !seller) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.page}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <ServerOfflineView
            title="Boutique indisponible"
            message={error || 'Cette boutique n’existe pas ou n’est plus active.'}
            onRetry={load}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {seller.shopName}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

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
          <View style={styles.bannerWrap}>
            {seller.bannerUrl ? (
              <Image
                source={{ uri: resolveMediaUrl(seller.bannerUrl) }}
                style={styles.banner}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.bannerFallback}>
                <Ionicons name="storefront" size={42} color="rgba(255,255,255,0.7)" />
              </View>
            )}
            <View style={styles.bannerOverlay} />
          </View>

          <View style={styles.identityCard}>
            <View style={styles.avatar}>
              {seller.avatarUrl ? (
                <Image
                  source={{ uri: resolveMediaUrl(seller.avatarUrl) }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{seller.shopName.charAt(0)}</Text>
              )}
            </View>
            <View style={styles.identityBody}>
              <View style={styles.shopNameRow}>
                <Text style={styles.shopName}>{seller.shopName}</Text>
                {seller.isPro && (
                  <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                )}
              </View>
              <Text style={styles.shopTagline}>
                {seller.tagline || 'Boutique partenaire Élan'}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Ionicons name="star" size={12} color={colors.gold} />
                  <Text style={styles.statText}>
                    {(seller.rating || 0).toFixed(1)}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.muted} />
                  <Text style={styles.statText}>{seller.reviewCount} avis</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="cube-outline" size={12} color={colors.muted} />
                  <Text style={styles.statText}>{seller.productCount} produits</Text>
                </View>
              </View>
            </View>
          </View>

          {seller.description ? (
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{seller.description}</Text>
            </View>
          ) : null}

          {categories.length > 0 && (
            <View style={styles.categoriesRow}>
              {categories.map((category) => (
                <View key={category} style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{category}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>La sélection</Text>
            <Text style={styles.sectionCount}>{products.length}</Text>
          </View>

          {products.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={28} color={colors.muted} />
              <Text style={styles.emptyText}>Cette boutique n’a pas encore de produit en ligne.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {products.map((apiProduct) => {
                const product = apiProductToClientProduct(apiProduct);
                return (
                  <View key={product.id} style={styles.gridItem}>
                    <ProductCard
                      product={product}
                      wishlisted={wishlist.includes(product.id)}
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

          {reviews.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Avis sur la boutique</Text>
              </View>
              {reviews.slice(0, 3).map((review, index) => (
                <View key={review.id || index} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <Text style={styles.reviewerName}>{review.userName}</Text>
                    <View style={styles.reviewRating}>
                      <Ionicons name="star" size={11} color={colors.gold} />
                      <Text style={styles.reviewRatingText}>{review.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                  {review.productTitle ? (
                    <Text style={styles.reviewProduct}>À propos de « {review.productTitle} »</Text>
                  ) : null}
                  <Text style={styles.reviewBody}>{review.comment}</Text>
                  {review.sellerReply ? (
                    <View style={styles.replyBox}>
                      <Text style={styles.replyAuthor}>Réponse de la boutique</Text>
                      <Text style={styles.replyText}>{review.sellerReply}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: colors.muted },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
    marginHorizontal: 12,
  },
  headerSpacer: { width: 38 },
  scroll: { paddingBottom: 40 },
  bannerWrap: { height: 150, marginHorizontal: 16, borderRadius: radius.xl, overflow: 'hidden' },
  banner: { width: '100%', height: '100%' },
  bannerFallback: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.18)',
  },
  identityCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: -28,
    borderRadius: radius.xl,
    padding: 14,
    ...shadow.card,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.primary },
  identityBody: { flex: 1 },
  shopNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  shopName: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  shopTagline: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontFamily: fonts.semibold, fontSize: 10.5, color: colors.inkSoft },
  descriptionCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: radius.lg,
    padding: 14,
  },
  descriptionText: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19, color: colors.inkSoft },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  categoryChipText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.primary },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  sectionCount: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  gridItem: { width: '47.5%' },
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, textAlign: 'center' },
  reviewCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: radius.lg,
    padding: 14,
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewerName: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  reviewRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  reviewRatingText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.inkSoft },
  reviewProduct: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.muted, marginTop: 3 },
  reviewBody: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.inkSoft, marginTop: 6 },
  replyBox: {
    marginTop: 8,
    padding: 9,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  replyAuthor: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.primary },
  replyText: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.inkSoft, marginTop: 2 },
});
