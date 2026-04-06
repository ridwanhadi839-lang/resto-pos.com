import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CartItem as CartItemType } from '../types';
import { COLORS, RADIUS } from '../constants/theme';
import { formatPrice } from '../data/mockData';

interface CartItemProps {
  item: CartItemType;
  onRemove: (id: string) => void;
  onEdit: (item: CartItemType) => void;
  showRemove?: boolean;
}

export const CartItemRow: React.FC<CartItemProps> = ({
  item,
  onRemove,
  onEdit,
  showRemove = true,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.infoCard} onPress={() => onEdit(item)} activeOpacity={0.8}>
          <View style={styles.titleRow}>
            <View style={styles.nameButton}>
              <Text style={styles.name}>{`${item.quantity} ${item.product.name}`}</Text>
            </View>
          </View>

          {item.options && item.options.length > 0 ? (
            <View style={styles.optionsList}>
              {item.options.map((option) => (
                <Text key={`${item.id}-${option}`} style={styles.options}>
                  {option}
                </Text>
              ))}
            </View>
          ) : null}

          {item.note ? <Text style={styles.note}>Note: {item.note}</Text> : null}
        </TouchableOpacity>

        <View style={styles.priceWrap}>
          <Text style={styles.price}>{formatPrice(item.product.price * item.quantity)}</Text>
          {showRemove ? (
            <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(item.id)}>
              <Text style={styles.removeBtnText}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingVertical: 10,
  },
  topRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoCard: {
    flex: 1,
    gap: 4,
    borderRadius: RADIUS.md,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flex: 1,
    color: '#111111',
    fontSize: 13,
    fontWeight: '700',
  },
  nameButton: {
    flex: 1,
  },
  optionsList: {
    gap: 2,
  },
  options: {
    color: COLORS.textGray,
    fontSize: 11,
    fontWeight: '600',
  },
  note: {
    color: COLORS.textGray,
    fontSize: 11,
    fontWeight: '600',
  },
  priceWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  price: {
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: '700',
  },
  removeBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeBtnText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: '700',
  },
});
