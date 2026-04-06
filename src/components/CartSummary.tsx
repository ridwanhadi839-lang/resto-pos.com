import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { formatPrice } from '../data/mockData';

interface CartSummaryProps {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  splitBillCount: number;
  splitTotal: number;
  onPay: () => void;
  disabled?: boolean;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  subtotal,
  discount,
  tax,
  total,
  splitBillCount,
  splitTotal,
  onPay,
  disabled,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Subtotal</Text>
        <Text style={styles.value}>{formatPrice(subtotal)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Discount</Text>
        <Text style={styles.value}>- {formatPrice(discount)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Tax</Text>
        <Text style={styles.value}>{formatPrice(tax)}</Text>
      </View>

      {splitBillCount > 1 ? (
        <View style={styles.splitCard}>
          <Text style={styles.splitText}>
            Split {splitBillCount}x = {formatPrice(splitTotal)} / bill
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.payBtn, disabled && styles.payBtnDisabled]}
        onPress={onPay}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <View style={styles.payBtnContent}>
          <Text style={styles.payBtnAmount}>{formatPrice(total)}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    opacity: 0.5,
  },
  label: {
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  splitCard: {
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.lightPurple,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  splitText: {
    color: COLORS.primaryPurple,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  payBtn: {
    backgroundColor: COLORS.primaryPurple,
    borderRadius: RADIUS.lg,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primaryPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payBtnContent: {
    width: '100%',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  payBtnAmount: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
});
