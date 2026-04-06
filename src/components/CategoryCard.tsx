import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Category } from '../types';
import { COLORS, RADIUS } from '../constants/theme';

interface CategoryCardProps {
  category: Category;
  isActive: boolean;
  onPress: (category: Category) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, isActive, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.cardActive]}
      onPress={() => onPress(category)}
      activeOpacity={0.75}
    >
      <Text
        style={[styles.label, isActive && styles.labelActive]}
        numberOfLines={1}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardActive: {
    backgroundColor: COLORS.primaryPurple,
    borderColor: COLORS.primaryPurple,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  labelActive: {
    color: COLORS.white,
  },
});
