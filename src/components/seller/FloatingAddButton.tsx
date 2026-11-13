import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FloatingAddButtonProps {
  onPress?: () => void;
  bottomOffset?: number;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onPress,
  bottomOffset = 80,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, { bottom: bottomOffset }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel="Ajouter un nouveau produit"
    >
      <Ionicons name="add" size={18} color="#FFFFFF" style={styles.icon} />
      <Text style={styles.text}>Nouveau produit</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A58CA',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#0A58CA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
