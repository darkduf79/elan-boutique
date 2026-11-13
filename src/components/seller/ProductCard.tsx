import React from 'react';
import {
  Image,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductItem } from '../../types/seller';

interface ProductCardProps {
  product: ProductItem;
  onEditPress?: (productId: string) => void;
  onToggleOnline?: (productId: string, isOnline: boolean) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEditPress,
  onToggleOnline,
}) => {
  const formatPrice = (price: number): string => {
    return price.toFixed(2).replace('.', ',') + ' €';
  };

  const renderStockText = () => {
    if (product.stockStatus === 'out_of_stock' || product.stockCount === 0) {
      return 'Rupture : 0 ex.';
    }
    if (product.stockStatus === 'low_stock') {
      return `Stock faible : ${product.stockCount} restants`;
    }
    return `En stock : ${product.stockCount} ex.`;
  };

  const getStockDotColor = () => {
    if (product.stockStatus === 'out_of_stock' || product.stockCount === 0) {
      return '#EF4444'; // Red
    }
    if (product.stockStatus === 'low_stock') {
      return '#F59E0B'; // Amber
    }
    return '#10B981'; // Green
  };

  const renderTag = () => {
    if (!product.tag) return null;

    let badgeStyle = styles.customTag;
    let textStyle = styles.customTagText;

    if (product.tag.type === 'alert') {
      badgeStyle = styles.alertTag;
      textStyle = styles.alertTagText;
    } else if (product.tag.type === 'danger') {
      badgeStyle = styles.dangerTag;
      textStyle = styles.dangerTagText;
    }

    return (
      <View style={[styles.tagBadge, badgeStyle]}>
        <Text style={[styles.tagText, textStyle]}>{product.tag.label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* Top Part: Image + Product Info + Edit Button */}
      <View style={styles.topSection}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          {renderTag()}
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {product.title}
            </Text>
            <TouchableOpacity
              onPress={() => onEditPress?.(product.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={`Modifier ${product.title}`}
            >
              <Ionicons name="pencil-outline" size={17} color="#475569" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle} numberOfLines={1}>
            {product.subtitle}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {product.originalPrice && (
              <Text style={styles.originalPrice}>
                {formatPrice(product.originalPrice)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Bottom Row: Stock dot & label on left, Online toggle switch on right */}
      <View style={styles.bottomRow}>
        <View style={styles.stockStatusContainer}>
          <View
            style={[
              styles.stockDot,
              { backgroundColor: getStockDotColor() },
            ]}
          />
          <Text style={styles.stockLabel}>{renderStockText()}</Text>
        </View>

        <View style={styles.onlineToggleContainer}>
          <Text
            style={[
              styles.onlineLabel,
              !product.isOnline && styles.offlineLabel,
            ]}
          >
            {product.isOnline ? 'En ligne' : 'Hors ligne'}
          </Text>
          <Switch
            value={product.isOnline}
            onValueChange={(val) => onToggleOnline?.(product.id, val)}
            trackColor={{ false: '#CBD5E1', true: '#0A58CA' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#CBD5E1"
            style={styles.switch}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topSection: {
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    width: 86,
    height: 86,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  tagBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  customTag: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  customTagText: {
    color: '#1D4ED8',
  },
  alertTag: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  alertTagText: {
    color: '#D97706',
  },
  dangerTag: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  dangerTagText: {
    color: '#DC2626',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 6,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 12.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  stockStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  stockLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  onlineToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
    marginRight: 8,
  },
  offlineLabel: {
    color: '#64748B',
  },
  switch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
});
