import React from 'react';
import { ScrollView, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { OrderTypeSelector } from '../../components/OrderTypeSelector';
import { CartItemRow } from '../../components/CartItemRow';
import { CartSummary } from '../../components/CartSummary';
import { COLORS, RADIUS } from '../../constants/theme';
import { CartItem, CustomerInfo, Order } from '../../types';
import { getOrderModeLabel } from './posScreen.constants';

interface POSCartPanelProps {
  style?: StyleProp<ViewStyle>;
  orderNumber: string;
  orderType: Order['orderType'];
  customer: CustomerInfo;
  hasCustomerInfo: boolean;
  discountPercent: number;
  pendingCartCount: number;
  pendingSyncCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncError: string | null;
  isPaidOrderLoaded: boolean;
  orderNote?: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  onSelectOrderType: (orderType: Order['orderType']) => void;
  onOpenCustomerModal: () => void;
  onEditCartItem: (item: CartItem) => void;
  onRemoveCartItem: (id: string) => void;
  onPay: () => void;
  onRetrySync: () => void;
  payDisabled: boolean;
}

export const POSCartPanel: React.FC<POSCartPanelProps> = ({
  style,
  orderNumber,
  orderType,
  customer,
  hasCustomerInfo,
  discountPercent,
  pendingCartCount,
  pendingSyncCount,
  isOnline,
  isSyncing,
  lastSyncError,
  isPaidOrderLoaded,
  orderNote,
  items,
  itemCount,
  subtotal,
  discount,
  tax,
  total,
  onSelectOrderType,
  onOpenCustomerModal,
  onEditCartItem,
  onRemoveCartItem,
  onPay,
  onRetrySync,
  payDisabled,
}) => {
  const syncStatusLabel = isSyncing
    ? 'Sync berjalan'
    : !isOnline
      ? 'Offline'
      : pendingSyncCount > 0
        ? `${pendingSyncCount} pending sync`
        : 'Online';
  const syncStatusText = isSyncing
    ? 'Mengirim order ke Supabase...'
    : !isOnline
      ? 'Order baru akan disimpan di SQLite sampai koneksi kembali.'
      : pendingSyncCount > 0
        ? 'Order lokal siap dikirim ke Supabase.'
        : 'Supabase siap menerima order.';
  const retryDisabled = !isOnline || isSyncing || pendingSyncCount === 0;

  return (
    <View style={[styles.cartPanel, style]}>
      <View style={styles.invoiceCard}>
        <View>
          <Text style={styles.invoiceLabel}>No Invoice</Text>
          <Text style={styles.invoiceValue}>{orderNumber}</Text>
        </View>
        <View style={[styles.modeBadge, orderType === 'delivery' && styles.modeBadgeDelivery]}>
          <Text style={styles.modeBadgeText}>{getOrderModeLabel(orderType)}</Text>
        </View>
      </View>

      <View
        style={[
          styles.syncStatusCard,
          !isOnline && styles.syncStatusOffline,
          pendingSyncCount > 0 && isOnline && styles.syncStatusPending,
        ]}
      >
        <View style={styles.syncStatusContent}>
          <Text style={styles.syncStatusLabel}>{syncStatusLabel}</Text>
          <Text style={styles.syncStatusText}>
            {lastSyncError && pendingSyncCount > 0 ? lastSyncError : syncStatusText}
          </Text>
        </View>

        {pendingSyncCount > 0 ? (
          <TouchableOpacity
            style={[styles.syncRetryButton, retryDisabled && styles.syncRetryButtonDisabled]}
            onPress={onRetrySync}
            disabled={retryDisabled}
            activeOpacity={0.85}
          >
            <Text style={styles.syncRetryText}>{isSyncing ? 'Mengirim...' : 'Retry'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.orderControlBlock}>
        <OrderTypeSelector selected={orderType} onSelect={onSelectOrderType} />
      </View>

      <TouchableOpacity
        style={styles.customerSummaryCard}
        onPress={onOpenCustomerModal}
        activeOpacity={0.85}
      >
        <View style={styles.customerSummaryContent}>
          <Text style={styles.customerSummaryLabel}>Customer</Text>
          {hasCustomerInfo ? (
            <>
              <Text style={styles.customerSummaryName}>{customer.name.trim() || 'Tanpa nama'}</Text>
              <Text style={styles.customerSummaryPhone}>
                {customer.phone.trim() || 'No telepon belum diisi'}
              </Text>
            </>
          ) : (
            <Text style={styles.customerSummaryEmpty}>Belum ada customer dipilih.</Text>
          )}
        </View>

        <View style={styles.customerSummaryAction}>
          <Text style={styles.customerSummaryActionText}>{hasCustomerInfo ? 'Edit' : 'Tambah'}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.cartHeaderRow}>
        <Text style={styles.cartTitle}>Cart</Text>
        <Text style={styles.cartCount}>
          {itemCount} item
          {discountPercent > 0 ? ` | Disc ${discountPercent}%` : ''}
          {pendingCartCount > 0 ? ` | Cart Pending ${pendingCartCount}` : ''}
          {pendingSyncCount > 0 ? ` | Sync ${pendingSyncCount}` : ''}
          {isPaidOrderLoaded ? ' | Sudah Paid' : ''}
          {orderNote ? ' | Note' : ''}
        </Text>
      </View>

      <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onRemove={onRemoveCartItem}
            onEdit={onEditCartItem}
            showRemove={itemCount > 1}
          />
        ))}
      </ScrollView>

      <CartSummary
        subtotal={subtotal}
        discount={discount}
        tax={tax}
        total={total}
        splitBillCount={1}
        splitTotal={total}
        onPay={onPay}
        disabled={payDisabled}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cartPanel: {
    alignSelf: 'stretch',
    minHeight: 0,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 10,
  },
  invoiceCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceLabel: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  invoiceValue: {
    fontSize: 22,
    color: COLORS.textDark,
    fontWeight: '800',
    marginTop: 4,
  },
  modeBadge: {
    backgroundColor: COLORS.primaryPurple,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modeBadgeDelivery: {
    backgroundColor: COLORS.success,
  },
  modeBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  syncStatusCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: 10,
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  syncStatusOffline: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  syncStatusPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  syncStatusContent: {
    flex: 1,
    gap: 2,
  },
  syncStatusLabel: {
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: '800',
  },
  syncStatusText: {
    color: COLORS.textGray,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  syncRetryButton: {
    minWidth: 76,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  syncRetryButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  syncRetryText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  orderControlBlock: {
    gap: 8,
  },
  customerSummaryCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  customerSummaryContent: {
    flex: 1,
    gap: 2,
  },
  customerSummaryLabel: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  customerSummaryName: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  customerSummaryPhone: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  customerSummaryEmpty: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  customerSummaryAction: {
    minWidth: 72,
    height: 34,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  customerSummaryActionText: {
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: '700',
  },
  cartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  cartTitle: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  cartCount: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  cartList: {
    flex: 1,
  },
});
