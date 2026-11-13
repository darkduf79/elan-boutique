import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import QuantityStepper from '@/components/QuantityStepper';
import RatingStars from '@/components/RatingStars';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ServerOfflineView } from '@/components/ServerOfflineView';
import { colors, fonts, radius, shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { contrastOn, formatPrice } from '@/lib/format';
import { api, resolveMediaUrl, type ApiProduct } from '@/services/api';
import { findCachedProduct } from '@/services/offlineStore';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem, cart, wishlist, toggleWishlist } = useCart();
  const { isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const [activeImage, setActiveImage] = useState(0);
  const [finish, setFinish] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const contentWidth = Math.min(width, 560);
  const heroWidth = contentWidth - 32;
  const featureWidth = (contentWidth - 32 - 10) / 2;

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setLoading(true);
      const prodData = await api.getProductById(id);
      setProduct(prodData);
      setIsOffline(false);
    } catch (err: any) {
      // Repli hors-ligne : on retrouve le produit dans le catalogue local.
      const cached = await findCachedProduct(id);
      if (cached) {
        setProduct(cached);
        setIsOffline(true);
        setError(null);
      } else {
        setError(err.message || 'Impossible de charger le produit.');
        setProduct(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProduct();
  }, [loadProduct]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement du produit...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.page}>
          <Pressable style={styles.notFoundBack} onPress={() => router.back()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <ServerOfflineView
            title="Produit inaccessible"
            message={error || 'Ce produit ne peut pas être récupéré du serveur.'}
            onRetry={loadProduct}
          />
        </View>
      </SafeAreaView>
    );
  }

  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const finishes = product.finishes || [];
  const chosenFinish = finishes[finish] ?? finishes[0];
  const reviews = product.reviews || [];
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 2);
  const seller = product.seller;
  const favorite = wishlist.includes(product.id);

  // Images list (handles strings and array)
  const productImages = (
    product.images && product.images.length > 0
      ? product.images
      : product.image
      ? [product.image]
      : []
  )
    .map((img) => resolveMediaUrl(img))
    .filter((img): img is string => Boolean(img));

  // Stock réellement disponible : stock total moins ce qui est déjà au panier.
  const inCart = cart[product.id] ?? 0;
  const available = Math.max(0, product.stock - inCart);

  const toggleFavorite = () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour enregistrer vos favoris.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/(tabs)/profil') },
      ]);
      return;
    }
    toggleWishlist(product.id);
  };

  const shareProduct = async () => {
    try {
      await Share.share({ message: `${product.title} · ${formatPrice(product.price)}` });
    } catch {
      // Sharing can be dismissed
    }
  };

  const changeQuantity = (delta: number) => {
    setQuantity((value) => Math.min(Math.max(value + delta, 1), Math.max(available, 1)));
  };

  const handleAddToCart = () => {
    if (available <= 0) {
      Alert.alert('Stock', 'Ce produit est en rupture de stock.');
      return;
    }
    const toAdd = Math.min(quantity, available);
    addItem(product.id, toAdd, {
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image || productImages[0],
      category: product.category,
      stock: product.stock,
    });
    setQuantity(1);
    Alert.alert('Panier', `${toAdd} × « ${product.title} » ajouté(s) au panier !`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={() => router.back()} accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {product.headerLabel || product.category?.toUpperCase() || 'PRODUIT'}
          </Text>
          <View style={styles.headerRight}>
            <Pressable style={styles.headerButton} onPress={shareProduct} accessibilityLabel="Partager">
              <Ionicons name="share-outline" size={18} color={colors.ink} />
            </Pressable>
            <Pressable style={styles.headerButton} onPress={toggleFavorite} accessibilityLabel="Favori">
              <Ionicons
                name={favorite ? 'heart' : 'heart-outline'}
                size={18}
                color={favorite ? colors.roseInk : colors.ink}
              />
            </Pressable>
          </View>
        </View>

        {isOffline && <OfflineBanner onRetry={loadProduct} />}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Galerie Hero */}
          <View style={styles.heroWrap}>
            <View style={styles.heroCard}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(event) => {
                  const offset = event.nativeEvent.contentOffset.x;
                  const index = Math.round(offset / heroWidth);
                  setActiveImage(index);
                }}>
                {productImages.map((img, index) => (
                  <View key={index} style={[styles.heroSlide, { width: heroWidth }]}>
                    <Image
                      source={typeof img === 'string' ? { uri: img } : img}
                      style={styles.heroImage}
                      resizeMode="contain"
                    />
                  </View>
                ))}
              </ScrollView>

              <View style={styles.heroBadges}>
                <View style={styles.badgeOfficial}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
                  <Text style={styles.badgeOfficialText}>OFFICIEL</Text>
                </View>
                {discount > 0 && (
                  <View style={styles.badgeDiscount}>
                    <Text style={styles.badgeDiscountText}>-{discount}%</Text>
                  </View>
                )}
              </View>

              {productImages.length > 1 && (
                <View style={styles.dots}>
                  {productImages.map((_, index) => (
                    <View key={index} style={[styles.dot, activeImage === index && styles.dotActive]} />
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Informations produit */}
          <View style={styles.infoCard}>
            <Text style={styles.brand}>{product.brand || 'ÉLAN'}</Text>
            <Text style={styles.title}>{product.title}</Text>

            <View style={styles.metaRow}>
              <View style={styles.ratingRow}>
                <RatingStars rating={product.rating} size={13} />
                <Text style={styles.ratingValue}>{product.rating?.toFixed(1) || '5.0'}</Text>
                <Text style={styles.reviewsTotal}>({product.reviewCount || 0} avis)</Text>
              </View>
              <Text style={styles.refText}>Réf : {product.ref || 'ELN-001'}</Text>
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceWrap}>
                <Text style={styles.price}>{formatPrice(product.price)}</Text>
                {product.oldPrice && <Text style={styles.oldPrice}>{formatPrice(product.oldPrice)}</Text>}
              </View>
              <View style={[styles.stockPill, available <= 0 ? styles.stockPillOut : styles.stockPillIn]}>
                <View style={[styles.stockDot, available <= 0 ? styles.stockDotOut : styles.stockDotIn]} />
                <Text style={[styles.stockText, available <= 0 ? styles.stockTextOut : styles.stockTextIn]}>
                  {available <= 0
                    ? 'Rupture'
                    : available <= 3
                    ? `Plus que ${available} ex.`
                    : 'En stock'}
                </Text>
              </View>
            </View>

            {/* Finitions */}
            {finishes.length > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>FINITIONS</Text>
                  <Text style={styles.sectionValue}>{chosenFinish?.name}</Text>
                </View>
                <View style={styles.finishesRow}>
                  {finishes.map((item, index) => {
                    const selected = finish === index;
                    return (
                      <Pressable
                        key={item.name}
                        onPress={() => setFinish(index)}
                        style={[styles.finishRing, selected && styles.finishRingSelected]}>
                        <View style={[styles.finishSwatch, { backgroundColor: item.hex }]}>
                          {selected && <Ionicons name="checkmark" size={13} color={contrastOn(item.hex)} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Points clés */}
            {product.features && product.features.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>POINTS CLÉS</Text>
                <View style={styles.featuresGrid}>
                  {product.features.map((feat) => (
                    <View key={feat.label} style={[styles.featureCard, { width: featureWidth }]}>
                      <View style={[styles.featureIconWrap, { backgroundColor: feat.tint }]}>
                        <Ionicons name={(feat.icon || 'shield-outline') as IconName} size={18} color={feat.iconColor} />
                      </View>
                      <Text style={styles.featureLabel}>{feat.label}</Text>
                      <Text style={styles.featureValue} numberOfLines={2}>
                        {feat.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Description */}
            {product.description && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                <Text style={styles.description} numberOfLines={expanded ? undefined : 3}>
                  {product.description}
                </Text>
                <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={8} style={styles.readMore}>
                  <Text style={styles.readMoreText}>{expanded ? 'Voir moins' : 'En savoir plus'}</Text>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
                </Pressable>
              </>
            )}
          </View>

          {/* Vendeur */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              {seller?.avatarUrl ? (
                <Image
                  source={{ uri: resolveMediaUrl(seller.avatarUrl) }}
                  style={styles.sellerAvatarImage}
                />
              ) : (
                <Ionicons name="storefront" size={18} color={colors.primary} />
              )}
            </View>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName} numberOfLines={1}>
                  {seller?.shopName || 'Boutique Élan'}
                </Text>
                {seller?.isPro && (
                  <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                )}
              </View>
              <Text style={styles.sellerTagline} numberOfLines={1}>
                {seller?.tagline || 'Boutique partenaire Élan'}
              </Text>
            </View>
            <Pressable
              style={styles.visitButton}
              onPress={() => {
                if (seller) {
                  router.push(`/boutique/${seller.id}`);
                }
              }}>
              <Text style={styles.visitText}>Visiter</Text>
            </Pressable>
          </View>

          {/* Confiance */}
          <View style={styles.trustCard}>
            <View style={styles.trustItem}>
              <Ionicons name="star" size={15} color={colors.gold} />
              <Text style={styles.trustStrong}>
                {(product.rating || 0) > 0 ? product.rating.toFixed(1) : '—'}/5
              </Text>
              <Text style={styles.trustMuted}>({product.reviewCount || 0} avis)</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Ionicons name="cube-outline" size={15} color={colors.primary} />
              <Text style={styles.trustStrong}>
                {product.stock > 0 ? `${product.stock} en stock` : 'Rupture de stock'}
              </Text>
            </View>
          </View>

          {/* Avis clients */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <View style={styles.reviewsTitleRow}>
                <Text style={styles.sectionTitle}>Avis vérifiés</Text>
                <Text style={styles.reviewsCount}>{product.reviewCount || reviews.length}</Text>
              </View>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/avis',
                    params: { productId: product.id },
                  })
                }>
                <Text style={styles.seeAll}>+ Donner un avis</Text>
              </Pressable>
            </View>

            {reviews.length === 0 ? (
              <View style={styles.emptyReviewsCard}>
                <Text style={styles.emptyReviewsText}>Aucun avis pour le moment. Soyez le premier à donner votre avis !</Text>
              </View>
            ) : (
              visibleReviews.map((rev, index) => {
                const reviewerName = rev.userName || (rev as any).name || 'Client Élan';
                const commentText = rev.comment || (rev as any).text || '';
                const reviewDate = rev.createdAt
                  ? new Date(rev.createdAt).toLocaleDateString('fr-FR')
                  : (rev as any).date || 'Récemment';

                return (
                  <View key={rev.id || index} style={styles.reviewCard}>
                    <View style={styles.reviewerRow}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerInitial}>{reviewerName.charAt(0)}</Text>
                      </View>
                      <View style={styles.reviewerBody}>
                        <View style={styles.reviewerNameRow}>
                          <Text style={styles.reviewerName}>{reviewerName}</Text>
                          {rev.verified && (
                            <View style={styles.verifiedPill}>
                              <Ionicons name="checkmark" size={10} color={colors.primary} />
                              <Text style={styles.verifiedText}>Achat vérifié</Text>
                            </View>
                          )}
                          <Text style={styles.reviewDate}>{reviewDate}</Text>
                        </View>
                        <View style={styles.reviewStars}>
                          <RatingStars rating={rev.rating} size={11} />
                        </View>
                        <Text style={styles.reviewText}>{commentText}</Text>
                        {rev.sellerReply ? (
                          <View style={styles.sellerReplyBox}>
                            <View style={styles.sellerReplyHeader}>
                              <Ionicons name="storefront-outline" size={11} color={colors.primary} />
                              <Text style={styles.sellerReplyAuthor}>
                                Réponse de {seller?.shopName || 'la boutique'}
                              </Text>
                            </View>
                            <Text style={styles.sellerReplyText}>{rev.sellerReply}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {reviews.length > 2 && (
              <Pressable
                style={styles.moreReviewsBtn}
                onPress={() => setShowAllReviews((v) => !v)}>
                <Text style={styles.moreReviewsText}>
                  {showAllReviews ? 'Afficher moins d’avis' : `Voir les ${reviews.length} avis`}
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        {/* Barre du bas - Ajout Panier */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <QuantityStepper
            value={quantity}
            onDecrement={() => changeQuantity(-1)}
            onIncrement={() => changeQuantity(1)}
            max={available}
            size="lg"
          />
          <Pressable
            style={[styles.addButton, available <= 0 && styles.addButtonDisabled]}
            disabled={available <= 0}
            onPress={handleAddToCart}>
            <Ionicons name="cart-outline" size={18} color={colors.surface} />
            <Text style={styles.addButtonText} numberOfLines={1}>
              {available <= 0 ? 'Rupture de stock' : 'Ajouter au panier'}
            </Text>
            {available > 0 && (
              <Text style={styles.addButtonPrice} numberOfLines={1}>
                · {formatPrice(product.price * quantity)}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13, color: colors.muted },
  notFoundBack: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: colors.muted,
  },
  headerRight: { flexDirection: 'row', gap: 8 },
  scrollContent: { paddingBottom: 24 },
  heroWrap: { paddingHorizontal: 16, marginTop: 6 },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    ...shadow.card,
  },
  heroSlide: {
    height: 290,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  heroImage: { width: '100%', height: '100%' },
  heroBadges: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    gap: 6,
  },
  badgeOfficial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.primarySoft,
  },
  badgeOfficialText: {
    fontFamily: fonts.extrabold,
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: colors.primary,
  },
  badgeDiscount: {
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDiscountText: {
    fontFamily: fonts.extrabold,
    fontSize: 9.5,
    color: colors.roseInk,
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.primary,
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    ...shadow.card,
  },
  brand: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    letterSpacing: 1.1,
    color: colors.muted,
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 19,
    lineHeight: 25,
    color: colors.ink,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingValue: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  reviewsTotal: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  refText: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  priceWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  price: { fontFamily: fonts.extrabold, fontSize: 24, color: colors.ink },
  oldPrice: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  stockPillIn: { backgroundColor: colors.mint },
  stockPillOut: { backgroundColor: colors.roseSoft },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockDotIn: { backgroundColor: colors.mintInk },
  stockDotOut: { backgroundColor: colors.roseInk },
  stockText: { fontFamily: fonts.bold, fontSize: 10.5 },
  stockTextIn: { color: colors.mintInk },
  stockTextOut: { color: colors.roseInk },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.muted,
    marginBottom: 8,
  },
  sectionValue: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  finishesRow: { flexDirection: 'row', gap: 10 },
  finishRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishRingSelected: { borderColor: colors.primary },
  finishSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureCard: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  featureIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  featureLabel: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.muted },
  featureValue: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  description: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  readMore: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  readMoreText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.primary },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    gap: 12,
    ...shadow.soft,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sellerAvatarImage: { width: '100%', height: '100%' },
  sellerInfo: { flex: 1 },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerName: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink },
  sellerTagline: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 2 },
  visitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  visitText: { fontFamily: fonts.bold, fontSize: 11, color: colors.primary },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    ...shadow.soft,
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustStrong: { fontFamily: fonts.bold, fontSize: 11.5, color: colors.ink },
  trustMuted: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  trustDivider: { width: 1, height: 20, backgroundColor: colors.line },
  reviewsSection: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    ...shadow.soft,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  reviewsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  reviewsCount: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  seeAll: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
  emptyReviewsCard: { paddingVertical: 18, alignItems: 'center' },
  emptyReviewsText: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.muted, textAlign: 'center' },
  reviewCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  reviewerRow: { flexDirection: 'row', gap: 10 },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerInitial: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
  reviewerBody: { flex: 1 },
  reviewerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewerName: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.primarySoft,
  },
  verifiedText: { fontFamily: fonts.bold, fontSize: 9, color: colors.primary },
  reviewDate: { marginLeft: 'auto', fontFamily: fonts.medium, fontSize: 10, color: colors.muted },
  reviewStars: { marginVertical: 3 },
  reviewText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.inkSoft },
  sellerReplyBox: {
    marginTop: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: 8,
    gap: 3,
  },
  sellerReplyHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sellerReplyAuthor: { fontFamily: fonts.bold, fontSize: 10.5, color: colors.primary },
  sellerReplyText: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.inkSoft },
  moreReviewsBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  moreReviewsText: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 12,
    ...shadow.card,
  },
  addButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  addButtonDisabled: { backgroundColor: '#9CA3AF' },
  addButtonText: { fontFamily: fonts.bold, fontSize: 13, color: '#fff' },
  addButtonPrice: { fontFamily: fonts.semibold, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
});
