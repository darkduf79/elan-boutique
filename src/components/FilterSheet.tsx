import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import {
  DEFAULT_FILTERS,
  MIN_RATINGS,
  PRICE_RANGES,
  type Filters,
} from '@/lib/catalog';
import { colors, radius } from '@/theme';

interface Props {
  visible: boolean;
  value: Filters;
  onApply: (value: Filters) => void;
  onClose: () => void;
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function FilterSheet({ visible, value, onApply, onClose }: Props) {
  // Brouillon local : les filtres ne s'appliquent qu'au clic sur « Appliquer »
  const [draft, setDraft] = useState<Filters>(value);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible) setDraft(value);
  }, [visible, value]);

  return (
    <BottomSheet visible={visible} title="Filtrer" onClose={onClose}>
      <Text style={styles.section}>Prix</Text>
      <View style={styles.choices}>
        {PRICE_RANGES.map((r) => (
          <Choice
            key={r.key}
            label={r.label}
            selected={draft.priceRange === r.key}
            onPress={() => setDraft((d) => ({ ...d, priceRange: r.key }))}
          />
        ))}
      </View>

      <Text style={styles.section}>Note</Text>
      <View style={styles.choices}>
        {MIN_RATINGS.map((r) => (
          <Choice
            key={r.key}
            label={r.label}
            selected={draft.minRating === r.key}
            onPress={() => setDraft((d) => ({ ...d, minRating: r.key }))}
          />
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>En stock uniquement</Text>
        <Switch
          value={draft.inStockOnly}
          onValueChange={(v) => setDraft((d) => ({ ...d, inStockOnly: v }))}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.buttonGhost]} onPress={() => setDraft(DEFAULT_FILTERS)}>
          <Text style={styles.buttonGhostText}>Réinitialiser</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => {
            onApply(draft);
            onClose();
          }}>
          <Text style={styles.buttonPrimaryText}>Appliquer</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { fontSize: 13, color: colors.text },
  choiceTextSelected: { color: '#fff', fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  switchLabel: { fontSize: 15, color: colors.text },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  button: { flex: 1, paddingVertical: 14, borderRadius: radius.md, alignItems: 'center' },
  buttonGhost: { borderWidth: 1, borderColor: colors.border },
  buttonGhostText: { fontWeight: '700', color: colors.text },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonPrimaryText: { fontWeight: '700', color: '#fff' },
});
