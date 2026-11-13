import React, { useCallback, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BrandSplash } from '@/components/BrandSplash';
import { colors } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { StripeProvider } from '@/lib/stripe';
import { ConnectivityProvider } from '@/services/connectivity';

// Garde le splash natif visible le temps que l'écran animé soit prêt.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 250, fade: true });

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  return (
    <SafeAreaProvider>
      <StripeProvider>
        <AuthProvider>
          <CartProvider>
            <ConnectivityProvider>
              <StatusBar style={splashDone ? 'dark' : 'light'} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="produit/[id]"
                  options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="inscription"
                  options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="avis"
                  options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                  }}
                />
                <Stack.Screen
                  name="boutique/[id]"
                  options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="favoris"
                  options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="adresses"
                  options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="vendeur"
                  options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="paiement"
                  options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="facture/[id]"
                  options={{ animation: 'slide_from_right' }}
                />
                <Stack.Screen
                  name="suivi"
                  options={{ animation: 'slide_from_right' }}
                />
              </Stack>
            </ConnectivityProvider>
          </CartProvider>
        </AuthProvider>
      </StripeProvider>
      <BrandSplash onFinish={handleSplashFinish} />
    </SafeAreaProvider>
  );
}
