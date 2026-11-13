import { Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/BottomSheet';
import { SORT_OPTIONS, type SortKey } from '@/lib/catalog';
import { colors } from '@/theme';

interface Props {
  visible: boolean;
  value: SortKey;
  onChange: (value: SortKey) => void;
  onClose: () => void;
}

export function SortSheet({ visible, value, onChange, onClose }: Props) {
  return (
    <BottomSheet visible={visible} title="Trier par" onClose={onClose}>
      {SORT_OPTIONS.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            style={styles.row}
            onPress={() => {
              onChange(option.key);
              onClose();
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}>
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
            {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: { fontSize: 16, color: colors.text },
  labelSelected: { fontWeight: '700', color: colors.primary },
});
