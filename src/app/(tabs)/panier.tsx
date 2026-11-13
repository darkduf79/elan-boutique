import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import QuantityStepper from '@/components/QuantityStepper';
import { colors, fonts, radius, shadow } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/format';

export default function CartScreen() {
  const { lines, count, subtotal, setQuantity, removeItem } = useCart();

  const handleCheckout = () => {
    if (lines.length === 0) return;
    router.push('/paiement');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ÉLAN BOUTIQUE</Text>
            <Text style={styles.heading}>Mon panier</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countText}>
              {count} article{count > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {lines.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bag-handle-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Votre panier est vide</Text>
            <Text style={styles.emptyText}>Parcourez la boutique et ajoutez vos coups de cœur.</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)')}>
              <Text style={styles.primaryButtonText}>Découvrir les articles</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {lines.map(({ product, quantity }) => {
              const imageSource =
                typeof product.image === 'string'
                  ? { uri: product.image }
                  : product.image;

              return (
                <View key={product.id} style={styles.line}>
                  {imageSource ? (
                    <Image source={imageSource} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="cube-outline" size={24} color={colors.muted} />
                    </View>
                  )}
                  <View style={styles.lineBody}>
                    <Text style={styles.lineCategory}>{product.category || 'Article'}</Text>
                    <Text style={styles.lineTitle} numberOfLines={2}>
                      {product.title}
                    </Text>
                    <Text style={styles.linePrice}>{formatPrice(product.price)}</Text>
                  </View>
                  <View style={styles.lineActions}>
                    <Pressable
                      onPress={() => removeItem(product.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Retirer ${product.title}`}>
                      <Ionicons name="trash-outline" size={16} color={colors.muted} />
                    </Pressable>
                    <QuantityStepper
                      size="sm"
                      value={quantity}
                      onDecrement={() => setQuantity(product.id, quantity - 1)}
                      onIncrement={() => setQuantity(product.id, quantity + 1)}
                      max={product.stock || 99}
                    />
                  </View>
                </View>
              );
            })}

            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sous-total</Text>
                <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Livraison</Text>
                <Text style={styles.summaryFree}>Offerte</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice(subtotal)}</Text>
              </View>
              <Pressable
                style={styles.checkout}
                onPress={handleCheckout}>
                <Text style={styles.checkoutText}>Passer la commande</Text>
                <Ionicons name="arrow-forward" size={17} color={colors.surface} />
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  countText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.primary,
  },
  content: { padding: 16, paddingBottom: 96, gap: 12 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    ...shadow.soft,
  },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  thumbPlaceholder: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  lineBody: { flex: 1, gap: 2 },
  lineCategory: { fontFamily: fonts.medium, fontSize: 10.5, color: colors.muted },
  lineTitle: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, color: colors.ink },
  linePrice: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink, marginTop: 2 },
  lineActions: { alignItems: 'flex-end', justifyContent: 'space-between', height: 64 },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    gap: 10,
    ...shadow.soft,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  summaryValue: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  summaryFree: { fontFamily: fonts.bold, fontSize: 12, color: colors.mintInk },
  summaryDivider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
  totalLabel: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink },
  totalValue: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink },
  checkout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    marginTop: 6,
    ...shadow.button,
  },
  checkoutDisabled: { backgroundColor: '#9CA3AF' },
  checkoutText: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.surface },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink, marginTop: 16 },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  primaryButton: {
    marginTop: 18,
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },
  primaryButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.surface },
});
