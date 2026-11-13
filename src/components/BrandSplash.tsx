import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { colors } from '@/constants/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const BRAND_BLUE = '#2563EB';

// Repère de dessin identique aux assets 1024x1024 (voir assets/icon.png).
const GLYPH_WIDTH = 257;
const GLYPH_HEIGHT = 585;

type BrandSplashProps = {
  onFinish?: () => void;
};

/** Valeur animée stable sans lecture de ref pendant le rendu (règle react-hooks/refs). */
function useAnimatedValue(initialValue: number) {
  const [value] = useState(() => new Animated.Value(initialValue));
  return value;
}

/**
 * Écran de lancement animé : le "É" apparaît, l'accent tombe en place,
 * la barre orange se déploie, puis l'ensemble s'efface pour révéler l'app.
 */
export function BrandSplash({ onFinish }: BrandSplashProps) {
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(true);

  const logoHeight = Math.min(250, width * 0.52);
  const scale = logoHeight / GLYPH_HEIGHT;
  const logoWidth = GLYPH_WIDTH * scale;

  const overlayOpacity = useAnimatedValue(1);
  const logoOpacity = useAnimatedValue(0);
  const logoScale = useAnimatedValue(0.86);
  const accentOpacity = useAnimatedValue(0);
  const accentY = useAnimatedValue(-20);
  const barScaleX = useAnimatedValue(0);
  const wordmarkOpacity = useAnimatedValue(0);
  const wordmarkY = useAnimatedValue(10);

  useEffect(() => {
    // Le splash natif est déjà affiché : on le retire dès que le nôtre est prêt.
    SplashScreen.hide();

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 90,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.parallel([
        Animated.timing(accentOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(accentY, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.timing(barScaleX, {
        toValue: 1,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(wordmarkY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.delay(320),
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 380,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(logoScale, {
          toValue: 1.06,
          duration: 420,
          easing: Easing.in(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        setVisible(false);
        onFinish?.();
      }
    });

    return () => animation.stop();
  }, [
    accentOpacity,
    accentY,
    barScaleX,
    logoOpacity,
    logoScale,
    onFinish,
    overlayOpacity,
    wordmarkOpacity,
    wordmarkY,
  ]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      testID="brand-splash"
      style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}
    >
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={{ width: logoWidth, height: logoHeight }}>
          {/* Accent du É */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 98.5 * scale,
              top: 0,
              width: 87 * scale,
              height: 107 * scale,
              backgroundColor: colors.surface,
              opacity: accentOpacity,
              transform: [{ skewX: '-35deg' }, { translateY: accentY }],
            }}
          />

          {/* Hampe */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 130 * scale,
              width: 75 * scale,
              height: 365 * scale,
              backgroundColor: colors.surface,
            }}
          />

          {/* Barre supérieure */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 130 * scale,
              width: 253 * scale,
              height: 73 * scale,
              backgroundColor: colors.surface,
            }}
          />

          {/* Barre médiane */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 278 * scale,
              width: 227 * scale,
              height: 70 * scale,
              backgroundColor: colors.surface,
            }}
          />

          {/* Barre inférieure */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 422 * scale,
              width: 253 * scale,
              height: 73 * scale,
              backgroundColor: colors.surface,
            }}
          />

          {/* Barre orange */}
          <Animated.View
            testID="brand-splash-bar"
            style={{
              position: 'absolute',
              left: 0,
              top: 561 * scale,
              width: 257 * scale,
              height: 24 * scale,
              backgroundColor: colors.amber,
              transformOrigin: '0% 50%',
              transform: [{ scaleX: barScaleX }],
            }}
          />
        </View>

        <Animated.View
          style={{
            marginTop: 34,
            opacity: wordmarkOpacity,
            transform: [{ translateY: wordmarkY }],
          }}
        >
          <Text testID="brand-splash-wordmark" style={styles.wordmark}>
            ÉLAN
          </Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 999,
    elevation: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_BLUE,
  },
  logoWrapper: {
    alignItems: 'center',
  },
  wordmark: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 9,
    paddingLeft: 9,
  },
});
