import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { formatPrice } from '../data/mockData';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { Order, OrderStatus, PendingCart } from '../types';

const STATUS_CONFIG: Record<OrderStatus, { label: string }> = {
  pending: { label: 'Pending' },
  paid: { label: 'Paid' },
  sent_to_kitchen: { label: 'Kitchen' },
};

const getOrderTypeLabel = (
  orderType: 'dine-in' | 'takeaway' | 'delivery',
  tableNumber?: string
) => {
  if (orderType === 'dine-in') return `Table ${tableNumber ?? '-'}`;
  if (orderType === 'delivery') return 'Delivery';
  return 'Take Away';
};

const formatTimeLabel = (value: string) =>
  new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const getItemsPreview = (items: Array<{ quantity: number; product: { name: string } }>) =>
  items
    .slice(0, 2)
    .map((item) => `${item.quantity}x ${item.product.name}`)
    .join(' • ');

const getCustomerName = (customer: { name?: string; phone?: string }) =>
  customer.name?.trim() || customer.phone?.trim() || 'Customer belum diisi';

export const OrdersScreen: React.FC = () => {
  const isLoading = useOrderStore((s) => s.isLoading);
  const getByStatus = useOrderStore((s) => s.getByStatus);
  const pendingCarts = useCartStore((s) => s.pendingCarts);
  const restorePendingCart = useCartStore((s) => s.restorePendingCart);
  const loadOrderIntoCart = useCartStore((s) => s.loadOrderIntoCart);

  const pendingOrders = getByStatus('pending');
  const paidOrders = getByStatus('paid');
  const kitchenOrders = getByStatus('sent_to_kitchen');

  const handleRestorePendingCart = (pendingCart: PendingCart) => {
    restorePendingCart(pendingCart.id);
  };

  const handleLoadOrder = (order: Order) => {
    loadOrderIntoCart(order);
  };

  const renderPendingCartRow = (pendingCart: PendingCart) => {
    const totalItems = pendingCart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = pendingCart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    return (
      <TouchableOpacity
        key={pendingCart.id}
        style={styles.tableRow}
        activeOpacity={0.8}
        onPress={() => handleRestorePendingCart(pendingCart)}
      >
        <View style={[styles.cell, styles.orderCell]}>
          <Text style={styles.primaryText}>{pendingCart.orderNumber}</Text>
          <Text style={styles.secondaryText}>{getCustomerName(pendingCart.customer)}</Text>
          <Text style={styles.tertiaryText}>{formatTimeLabel(pendingCart.createdAt)}</Text>
        </View>

        <View style={[styles.cell, styles.typeCell]}>
          <Text style={styles.primaryText}>
            {getOrderTypeLabel(pendingCart.orderType, pendingCart.tableNumber)}
          </Text>
          <Text style={styles.secondaryText}>{totalItems} item</Text>
        </View>

        <View style={[styles.cell, styles.itemsCell]}>
          <Text style={styles.primaryText} numberOfLines={1}>
            {getItemsPreview(pendingCart.items) || '-'}
          </Text>
          <Text style={styles.secondaryText}>
            {pendingCart.customer.phone?.trim() || 'Belum ada no telepon'}
          </Text>
        </View>

        <View style={[styles.cell, styles.statusCell]}>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Pending Cart</Text>
            <Text style={styles.pendingBadgeSubtext}>{getCustomerName(pendingCart.customer)}</Text>
          </View>
        </View>

        <View style={[styles.cell, styles.totalCell]}>
          <Text style={styles.totalValue}>{formatPrice(totalValue)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderRow = (order: Order) => {
    const statusConfig = STATUS_CONFIG[order.status];

    return (
      <TouchableOpacity
        key={order.id}
        style={styles.tableRow}
        activeOpacity={0.8}
        onPress={() => handleLoadOrder(order)}
      >
        <View style={[styles.cell, styles.orderCell]}>
          <Text style={styles.primaryText}>{order.orderNumber}</Text>
          <Text style={styles.secondaryText}>{getCustomerName(order.customer)}</Text>
          <Text style={styles.tertiaryText}>{formatTimeLabel(order.createdAt)}</Text>
        </View>

        <View style={[styles.cell, styles.typeCell]}>
          <Text style={styles.primaryText}>{getOrderTypeLabel(order.orderType, order.tableNumber)}</Text>
          <Text style={styles.secondaryText}>
            {order.items.reduce((sum, item) => sum + item.quantity, 0)} item
          </Text>
        </View>

        <View style={[styles.cell, styles.itemsCell]}>
          <Text style={styles.primaryText} numberOfLines={1}>
            {getItemsPreview(order.items) || '-'}
          </Text>
          <Text style={styles.secondaryText}>
            {order.customer.phone?.trim() || 'Belum ada no telepon'}
          </Text>
        </View>

        <View style={[styles.cell, styles.statusCell]}>
          <Text style={styles.statusText}>{statusConfig.label}</Text>
        </View>

        <View style={[styles.cell, styles.totalCell]}>
          <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const rows = useMemo(
    () => [
      ...pendingCarts.map(renderPendingCartRow),
      ...pendingOrders.map(renderOrderRow),
      ...paidOrders.map(renderOrderRow),
      ...kitchenOrders.map(renderOrderRow),
    ],
    [kitchenOrders, paidOrders, pendingCarts, pendingOrders]
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={COLORS.primaryPurple} />
          <Text style={styles.loaderText}>Loading orders...</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.content}>
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="table-large" size={26} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Belum ada order</Text>
            <Text style={styles.emptySub}>
              Order baru dan pending cart akan muncul otomatis di tabel ini.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.tableWrap}>
            <View style={styles.tableHeader}>
              <View style={[styles.headerCell, styles.orderCell]}>
                <Text style={styles.headerCellText}>Order</Text>
              </View>
              <View style={[styles.headerCell, styles.typeCell]}>
                <Text style={styles.headerCellText}>Tipe</Text>
              </View>
              <View style={[styles.headerCell, styles.itemsCell]}>
                <Text style={styles.headerCellText}>Item</Text>
              </View>
              <View style={[styles.headerCell, styles.statusCell]}>
                <Text style={styles.headerCellText}>Status</Text>
              </View>
              <View style={[styles.headerCell, styles.totalCell]}>
                <Text style={styles.headerCellText}>Total</Text>
              </View>
            </View>
            {rows}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
  },
  tableWrap: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCell: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  headerCellText: {
    color: COLORS.textGray,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 84,
    backgroundColor: COLORS.white,
  },
  cell: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 4,
  },
  orderCell: {
    width: 190,
  },
  typeCell: {
    width: 150,
  },
  itemsCell: {
    flex: 1,
    minWidth: 280,
  },
  statusCell: {
    width: 170,
    alignItems: 'flex-start',
  },
  totalCell: {
    width: 120,
    alignItems: 'flex-start',
  },
  primaryText: {
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryText: {
    color: COLORS.textGray,
    fontSize: 11,
    fontWeight: '600',
  },
  tertiaryText: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: '600',
  },
  totalValue: {
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: '800',
  },
  pendingBadge: {
    gap: 4,
  },
  pendingBadgeText: {
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: '700',
  },
  pendingBadgeSubtext: {
    color: COLORS.textGray,
    fontSize: 11,
    fontWeight: '600',
  },
  statusText: {
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    marginTop: 12,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyTitle: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: '800',
  },
  emptySub: {
    color: COLORS.textGray,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 320,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loaderText: {
    color: COLORS.textGray,
    fontWeight: '600',
  },
});
