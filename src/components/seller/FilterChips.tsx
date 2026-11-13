import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { FilterCategory, FilterOption } from '../../types/seller';

interface FilterChipsProps {
  options: FilterOption[];
  selectedCategory: FilterCategory;
  onSelectCategory: (category: FilterCategory) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
      style={styles.scrollView}
    >
      {options.map((option) => {
        const isSelected = selectedCategory === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            onPress={() => onSelectCategory(option.id)}
            style={[styles.chip, isSelected && styles.activeChip]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
              {`${option.label} (${option.count})`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    marginTop: 12,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeChip: {
    backgroundColor: '#0A58CA',
    borderColor: '#0A58CA',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  activeChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
