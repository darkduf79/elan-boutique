import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { SellerProvider, useSellerDashboard } from '@/context/SellerContext';

export default function VendeurLayout() {
  const { isAuthenticated, isSeller, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !isSeller) {
    return <Redirect href="/(tabs)/profil" />;
  }

  return (
    <SellerProvider>
      <SellerTabs />
    </SellerProvider>
  );
}

function SellerTabs() {
  const insets = useSafeAreaInsets();
  const { dashboard } = useSellerDashboard();

  const pendingOrders = dashboard?.pendingOrders ?? 0;
  const lowStock = (dashboard?.lowStockProducts ?? 0) + (dashboard?.outOfStockProducts ?? 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 10,
          lineHeight: 13,
          marginTop: 2,
        },
        tabBarStyle: {
          height: 62 + insets.bottom,
          paddingTop: 7,
          paddingBottom: 7 + insets.bottom,
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarBadgeStyle: {
          backgroundColor: colors.roseInk,
          color: colors.surface,
          fontFamily: fonts.bold,
          fontSize: 9,
          minWidth: 16,
          height: 16,
          lineHeight: 16,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tableau',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'speedometer' : 'speedometer-outline'} size={21} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="produits"
        options={{
          title: 'Produits',
          tabBarBadge: lowStock > 0 ? lowStock : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={21} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="commandes"
        options={{
          title: 'Commandes',
          tabBarBadge: pendingOrders > 0 ? pendingOrders : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={21} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="finances"
        options={{
          title: 'Finances',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={21} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="boutique"
        options={{
          title: 'Boutique',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={21} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
