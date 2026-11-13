import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/theme';
import { formatPrice } from '@/lib/catalog';
import type { Product } from '@/types';

interface Props {
  product: Product;
  wishlisted: boolean;
  quantityInCart: number;
  onToggleWishlist: (productId: string) => void;
  onAdd: (product: Product) => void;
  onPress?: (product: Product) => void;
}

function StockBadge({ stock }: { stock: number }) {
  if (stock > 5) return null;
  const out = stock <= 0;
  return (
    <View style={[styles.badge, out ? styles.badgeOut : styles.badgeLow]}>
      <Text style={[styles.badgeText, out ? styles.badgeTextOut : styles.badgeTextLow]}>
        {out ? 'Rupture de stock' : `Il en reste ${stock}`}
      </Text>
    </View>
  );
}

function ProductCardBase({ product, wishlisted, quantityInCart, onToggleWishlist, onAdd, onPress }: Props) {
  // Stock restant = stock total moins la quantité déjà présente au panier.
  const available = Math.max(0, product.stock - quantityInCart);
  const out = available <= 0;

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(product)} accessibilityRole="button">
      <View style={[styles.media, { backgroundColor: product.tint }]}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Ionicons name={product.icon} size={64} color={colors.primary} style={out && styles.dim} />
        )}
        <Pressable
          style={styles.heart}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleWishlist(product.id);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={wishlisted ? 'Retirer de la liste de souhaits' : 'Ajouter à la liste de souhaits'}>
          <Ionicons
            name={wishlisted ? 'heart' : 'heart-outline'}
            size={18}
            color={wishlisted ? colors.danger : colors.textMuted}
          />
        </Pressable>
        <StockBadge stock={available} />
      </View>

      <View style={styles.body}>
        <Text style={styles.subcategory} numberOfLines={1}>
          {product.subcategory}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          <Pressable
            style={[styles.addButton, out && styles.addButtonDisabled]}
            onPress={(e) => {
              e.stopPropagation?.();
              onAdd(product);
            }}
            disabled={out}
            accessibilityRole="button"
            accessibilityLabel={`Ajouter ${product.name} au panier`}
            accessibilityState={{ disabled: out }}>
            <Ionicons name={quantityInCart > 0 && out ? 'checkmark' : 'add'} size={17} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardBase);
export default ProductCard;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  media: {
    aspectRatio: 1.14,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  dim: { opacity: 0.4 },
  heart: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { position: 'absolute', left: 7, bottom: 6, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  badgeLow: { backgroundColor: '#FDE8C8' },
  badgeOut: { backgroundColor: colors.dangerSoft },
  badgeText: { fontSize: 8, fontWeight: '700' },
  badgeTextLow: { color: '#B45309' },
  badgeTextOut: { color: colors.danger },
  body: { paddingHorizontal: 7, paddingTop: 5, paddingBottom: 7 },
  subcategory: { fontSize: 9, color: colors.textMuted },
  name: { fontSize: 11, fontWeight: '800', color: colors.text, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  price: { fontSize: 15, fontWeight: '800', color: colors.text },
  addButton: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: { backgroundColor: '#94A3B8' },
});
