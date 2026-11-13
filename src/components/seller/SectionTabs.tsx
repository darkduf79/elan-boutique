import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionTab } from '../../types/seller';

interface SectionTabsProps {
  activeTab: SectionTab;
  onTabChange: (tab: SectionTab) => void;
  productsCount?: number;
  ordersCount?: number;
}

export const SectionTabs: React.FC<SectionTabsProps> = ({
  activeTab,
  onTabChange,
  productsCount = 12,
  ordersCount = 5,
}) => {
  const isProducts = activeTab === 'products';
  const isOrders = activeTab === 'orders';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tabButton, isProducts && styles.activeTabButton]}
        onPress={() => onTabChange('products')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="cube-outline"
          size={18}
          color={isProducts ? '#1D4ED8' : '#64748B'}
          style={styles.tabIcon}
        />
        <Text style={[styles.tabLabel, isProducts && styles.activeTabLabel]}>
          Mes produits
        </Text>
        <View style={styles.productsBadge}>
          <Text style={styles.productsBadgeText}>{productsCount}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, isOrders && styles.activeTabButton]}
        onPress={() => onTabChange('orders')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="receipt-outline"
          size={18}
          color={isOrders ? '#1D4ED8' : '#64748B'}
          style={styles.tabIcon}
        />
        <Text style={[styles.tabLabel, isOrders && styles.activeTabLabel]}>
          Commandes
        </Text>
        <View style={styles.ordersBadge}>
          <Text style={styles.ordersBadgeText}>{ordersCount}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#E6EDF8',
    borderRadius: 14,
    padding: 4,
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTabLabel: {
    fontWeight: '700',
    color: '#111827',
  },
  productsBadge: {
    marginLeft: 6,
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  productsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  ordersBadge: {
    marginLeft: 6,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  ordersBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
