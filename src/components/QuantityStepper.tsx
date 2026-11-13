import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';

type Props = {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
};

export default function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  min = 1,
  max = 99,
  size = 'md',
}: Props) {
  const canDecrement = value > min;
  const canIncrement = value < max;
  const compact = size === 'sm';

  return (
    <View style={[styles.container, size === 'sm' && styles.containerSm, size === 'lg' && styles.containerLg]}>
      <Pressable
        onPress={onDecrement}
        disabled={!canDecrement}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Diminuer la quantité"
        style={[styles.button, compact && styles.buttonSm, !canDecrement && styles.buttonDisabled]}
      >
        <Ionicons name="remove" size={compact ? 14 : 17} color={canDecrement ? colors.primary : colors.muted} />
      </Pressable>
      <Text style={[styles.value, compact && styles.valueSm]}>{value}</Text>
      <Pressable
        onPress={onIncrement}
        disabled={!canIncrement}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Augmenter la quantité"
        style={[styles.button, compact && styles.buttonSm, !canIncrement && styles.buttonDisabled]}
      >
        <Ionicons name="add" size={compact ? 14 : 17} color={canIncrement ? colors.primary : colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 48,
    paddingHorizontal: 4,
    minWidth: 106,
  },
  containerSm: {
    height: 32,
    borderRadius: 10,
    paddingHorizontal: 2,
    minWidth: 86,
  },
  containerLg: {
    height: 52,
    borderRadius: radius.lg,
  },
  button: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSm: {
    width: 26,
    height: 28,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
    minWidth: 20,
    textAlign: 'center',
  },
  valueSm: {
    fontSize: 12,
    minWidth: 16,
  },
});
