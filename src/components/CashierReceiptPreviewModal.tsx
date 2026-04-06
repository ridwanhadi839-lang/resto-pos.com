import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { formatPrice } from '../data/mockData';
import { Order } from '../types';

interface CashierReceiptPreviewModalProps {
  visible: boolean;
  order: Order | null;
  cashierName: string;
  restaurantName?: string;
  isPrinting?: boolean;
  onClose: () => void;
  onPrint: () => void;
}

const getOrderTypeLabel = (order: Order) => {
  if (order.orderType === 'dine-in') return 'Dine In';
  if (order.orderType === 'delivery') return 'Delivery';
  return 'Take Away';
};

const formatPrintedAt = (value: string) =>
  new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const CashierReceiptPreviewModal: React.FC<CashierReceiptPreviewModalProps> = ({
  visible,
  order,
  cashierName,
  restaurantName,
  isPrinting,
  onClose,
  onPrint,
}) => {
  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Preview Receipt</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.receiptPaper}>
                  <View style={styles.logoCircle}>
                    <Text style={styles.logoText}>
                      {(restaurantName ?? 'RestoPOS').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.storeName}>{restaurantName ?? 'RestoPOS'}</Text>
                  <Text style={styles.metaCentered}>{getOrderTypeLabel(order)}</Text>
                  {order.customer.phone ? (
                    <Text style={styles.metaCentered}>{order.customer.phone}</Text>
                  ) : null}
                  <Text style={styles.metaCentered}>Simplified Tax Invoice / Reprint</Text>

                  <View style={styles.invoiceBox}>
                    <Text style={styles.invoiceLabel}>No Invoice</Text>
                    <Text style={styles.invoiceValue}>{order.orderNumber}</Text>
                  </View>

                  <View style={styles.detailList}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Printed At</Text>
                      <Text style={styles.detailValue}>{formatPrintedAt(order.createdAt)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Cashier</Text>
                      <Text style={styles.detailValue}>{cashierName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Customer</Text>
                      <Text style={styles.detailValue}>{order.customer.name || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Receipt No</Text>
                      <Text style={styles.detailValue}>{order.customer.receiptNo || '-'}</Text>
                    </View>
                  </View>

                  {order.orderNote ? (
                    <View style={styles.orderNoteBox}>
                      <Text style={styles.orderNoteLabel}>Order Note</Text>
                      <Text style={styles.orderNoteText}>{order.orderNote}</Text>
                    </View>
                  ) : null}

                  <View style={styles.itemTable}>
                    <View style={styles.itemHeaderRow}>
                      <Text style={[styles.itemHeaderText, styles.itemNameColumn]}>Any Item</Text>
                      <Text style={[styles.itemHeaderText, styles.itemQtyColumn]}>Qty</Text>
                      <Text style={[styles.itemHeaderText, styles.itemAmountColumn]}>Amount</Text>
                    </View>

                    {order.items.map((item) => (
                      <View key={item.id} style={styles.itemRow}>
                        <View style={styles.itemNameColumn}>
                          <Text style={styles.itemName}>{item.product.name}</Text>
                          {item.options && item.options.length > 0 ? (
                            <Text style={styles.itemMeta}>{item.options.join(' | ')}</Text>
                          ) : null}
                          {item.note ? <Text style={styles.itemMeta}>Note: {item.note}</Text> : null}
                        </View>
                        <Text style={[styles.itemValue, styles.itemQtyColumn]}>{item.quantity}</Text>
                        <Text style={[styles.itemValue, styles.itemAmountColumn]}>
                          {formatPrice(item.product.price * item.quantity)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.totalSection}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalKey}>Subtotal</Text>
                      <Text style={styles.totalValue}>{formatPrice(order.subtotal)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalKey}>Discount</Text>
                      <Text style={styles.totalValue}>{formatPrice(order.discount)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalKey}>Tax</Text>
                      <Text style={styles.totalValue}>{formatPrice(order.tax)}</Text>
                    </View>
                    <View style={[styles.totalRow, styles.grandTotalRow]}>
                      <Text style={styles.grandTotalKey}>Total</Text>
                      <Text style={styles.grandTotalValue}>{formatPrice(order.total)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalKey}>Products Count</Text>
                      <Text style={styles.totalValue}>
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>Thank You</Text>
                    <Text style={styles.footerText}>Terima kasih sudah berbelanja</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.footerActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
                  <Text style={styles.secondaryButtonText}>Tutup</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={onPrint}>
                  <Text style={styles.primaryButtonText}>
                    {isPrinting ? 'Printing...' : 'Print Receipt'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '92%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  header: {
    height: 54,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  closeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textGray,
  },
  content: {
    padding: 18,
    alignItems: 'center',
  },
  receiptPaper: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  logoCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: COLORS.textDark,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  storeName: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
    textTransform: 'uppercase',
  },
  metaCentered: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  invoiceBox: {
    borderWidth: 1,
    borderColor: COLORS.textDark,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  invoiceLabel: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  invoiceValue: {
    fontSize: 24,
    color: COLORS.textDark,
    fontWeight: '800',
    marginTop: 2,
  },
  detailList: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailKey: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  orderNoteBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    backgroundColor: COLORS.background,
    gap: 4,
  },
  orderNoteLabel: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  orderNoteText: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  itemTable: {
    borderTopWidth: 1,
    borderTopColor: COLORS.textDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textDark,
    paddingVertical: 8,
    gap: 8,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemHeaderText: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemNameColumn: {
    flex: 1,
    paddingRight: 8,
  },
  itemQtyColumn: {
    width: 38,
    textAlign: 'center',
  },
  itemAmountColumn: {
    width: 84,
    textAlign: 'right',
  },
  itemName: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  itemMeta: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '600',
    marginTop: 2,
  },
  itemValue: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  totalSection: {
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalKey: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  grandTotalRow: {
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.textDark,
  },
  grandTotalKey: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  grandTotalValue: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    gap: 2,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  secondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  primaryButton: {
    flex: 1.2,
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
});
