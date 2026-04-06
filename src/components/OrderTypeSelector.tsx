import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { OrderType } from '../types';
import { COLORS, RADIUS } from '../constants/theme';

interface OrderTypeSelectorProps {
  selected: OrderType;
  onSelect: (type: OrderType) => void;
}

const ORDER_TYPE_ITEMS: { key: OrderType; label: string }[] = [
  { key: 'dine-in', label: 'Dine In' },
  { key: 'takeaway', label: 'Take Away' },
];

export const OrderTypeSelector: React.FC<OrderTypeSelectorProps> = ({ selected, onSelect }) => {
  return (
    <View style={styles.row}>
      {ORDER_TYPE_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[styles.card, selected === item.key && styles.cardActive]}
          onPress={() => onSelect(item.key)}
          activeOpacity={0.75}
        >
          <Text style={[styles.label, selected === item.key && styles.labelActive]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  card: {
    flex: 1,
    minWidth: 90,
    height: 40,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActive: {
    borderColor: COLORS.primaryPurple,
    backgroundColor: COLORS.primaryPurple,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textGray,
  },
  labelActive: {
    color: COLORS.white,
  },
});
