import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Order } from '../types';
import { COLORS, RADIUS } from '../constants/theme';
import { formatPrice } from '../data/mockData';

interface OrderCardProps {
  order: Order;
  onPress?: (order: Order) => void;
}

const STATUS_CONFIG = {
  pending: { color: COLORS.warning, bg: '#FEF3C7', label: 'Pending' },
  paid: { color: COLORS.success, bg: '#D1FAE5', label: 'Paid' },
  sent_to_kitchen: {
    color: COLORS.primaryPurple,
    bg: '#EDE9FE',
    label: 'Sent to Kitchen',
  },
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => {
  const config = STATUS_CONFIG[order.status];
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const orderTypeLabel =
    order.orderType === 'dine-in'
      ? `Table ${order.tableNumber ?? '-'}`
      : order.orderType === 'delivery'
        ? 'Delivery'
        : 'Take Away';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(order)} activeOpacity={0.8}>
      <View style={styles.left}>
        <Text style={styles.orderNum}>{order.orderNumber}</Text>
        <Text style={styles.meta}>
          {orderTypeLabel} - {itemCount} items
        </Text>
        <Text style={styles.customer}>{new Date(order.createdAt).toLocaleString('id-ID')}</Text>
        {order.customer.name ? <Text style={styles.customer}>{order.customer.name}</Text> : null}
      </View>
      <View style={styles.right}>
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
          <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>
        <Text style={styles.total}>{formatPrice(order.total)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  left: {
    flex: 1,
    gap: 3,
  },
  orderNum: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  meta: {
    fontSize: 12,
    color: COLORS.textGray,
  },
  customer: {
    fontSize: 11,
    color: COLORS.textGray,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: 140,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  total: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryPurple,
    textAlign: 'right',
  },
});
