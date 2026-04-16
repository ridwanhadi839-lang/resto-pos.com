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
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  emojiContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primaryPurple,
  },
  name: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'left',
    minHeight: 30,
    width: '100%',
    lineHeight: 15,
  },
  price: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primaryPurple,
    textAlign: 'left',
  },
});
