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
import { Order } from '../types';

interface KitchenTicketPreviewModalProps {
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

export const KitchenTicketPreviewModal: React.FC<KitchenTicketPreviewModalProps> = ({
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
                <Text style={styles.headerTitle}>Preview Kitchen Ticket</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.ticketPaper}>
                  <Text style={styles.restaurantName}>{restaurantName ?? 'RestoPOS'}</Text>
                  <Text style={styles.orderNumber}>
                    Order# {order.orderNumber.replace('INV-', '')}
                  </Text>

                  <View style={styles.metaSection}>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaKey}>Printed At:</Text>
                      <Text style={styles.metaValue}>{formatPrintedAt(order.createdAt)}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaKey}>Type:</Text>
                      <Text style={styles.metaValue}>{getOrderTypeLabel(order)}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaKey}>Guests:</Text>
                      <Text style={styles.metaValue}>{order.splitBillCount || 1}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaKey}>Device:</Text>
                      <Text style={styles.metaValue}>
                        {cashierName}
                        {restaurantName ? ` - ${restaurantName}` : ''}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaKey}>Date:</Text>
                      <Text style={styles.metaValue}>
                        {new Date(order.createdAt).toLocaleDateString('id-ID')}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaKey}>Time:</Text>
                      <Text style={styles.metaValue}>
                        {new Date(order.createdAt).toLocaleTimeString('id-ID')}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.ticketStatus}>NEW</Text>

                  {order.orderNote ? (
                    <View style={styles.orderNoteBox}>
                      <Text style={styles.orderNoteLabel}>Order Note</Text>
                      <Text style={styles.orderNoteText}>{order.orderNote}</Text>
                    </View>
                  ) : null}

                  {order.items.map((item) => (
                    <View key={item.id} style={styles.itemBlock}>
                      <Text style={styles.itemTitle}>
                        {item.quantity}x {item.product.name}
                      </Text>
                      {item.options?.map((option) => (
                        <Text key={`${item.id}-${option}`} style={styles.itemMeta}>
                          {option}
                        </Text>
                      ))}
                      {item.note ? <Text style={styles.itemMeta}>Note: {item.note}</Text> : null}
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.footerActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
                  <Text style={styles.secondaryButtonText}>Tutup</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={onPrint}>
                  <Text style={styles.primaryButtonText}>
                    {isPrinting ? 'Printing...' : 'Print Kitchen'}
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
    maxWidth: 520,
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
  ticketPaper: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  restaurantName: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  orderNumber: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  metaSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COLORS.textDark,
    borderBottomColor: COLORS.textDark,
    paddingVertical: 8,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaKey: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  metaValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  ticketStatus: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
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
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  itemBlock: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  itemMeta: {
    marginTop: 4,
    paddingLeft: 8,
    fontSize: 14,
    color: COLORS.textDark,
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
