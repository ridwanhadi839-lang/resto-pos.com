import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Product } from '../types';
import { COLORS, RADIUS } from '../constants/theme';
import { formatPrice } from '../data/mockData';

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onPress }) => {
  const productIcon = product.emoji ?? 'IT';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => onPress(product)}>
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{productIcon}</Text>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={styles.price}>{formatPrice(product.price)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
    minHeight: 168,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  emojiContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryPurple,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    minHeight: 32,
  },
  price: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryPurple,
    textAlign: 'center',
  },
});
