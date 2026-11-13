import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabKey } from '../../types/seller';

interface TabItemConfig {
  key: BottomTabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabItemConfig[] = [
  {
    key: 'dashboard',
    label: 'Tableau',
    icon: 'grid-outline',
    activeIcon: 'grid',
  },
  {
    key: 'orders',
    label: 'Commandes',
    icon: 'receipt-outline',
    activeIcon: 'receipt',
  },
  {
    key: 'catalog',
    label: 'Catalogue',
    icon: 'cube-outline',
    activeIcon: 'cube',
  },
  {
    key: 'finances',
    label: 'Finances',
    icon: 'bar-chart-outline',
    activeIcon: 'bar-chart',
  },
  {
    key: 'shop',
    label: 'Boutique',
    icon: 'storefront-outline',
    activeIcon: 'storefront',
  },
];

interface BottomNavigationBarProps {
  activeTab?: BottomTabKey;
  onTabPress?: (key: BottomTabKey) => void;
}

export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({
  activeTab = 'catalog',
  onTabPress,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const iconColor = isActive ? '#0A58CA' : '#475569';

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabButton}
            onPress={() => onTabPress?.(tab.key)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={22}
              color={iconColor}
            />
            <Text
              style={[
                styles.tabLabel,
                isActive && styles.activeTabLabel,
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
    marginTop: 3,
  },
  activeTabLabel: {
    color: '#0A58CA',
    fontWeight: '700',
  },
});
