import React from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import { formatPrice } from '../data/mockData';
import { PaymentLine, PaymentMethod } from '../types';

interface PaymentSubmitPayload {
  payments: PaymentLine[];
}

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitPayment: (payload: PaymentSubmitPayload) => void;
  totalAmount: number;
}

const METHODS: Array<{ key: PaymentMethod; label: string }> = [
  { key: 'cash', label: 'Cash' },
  { key: 'visa', label: 'Visa' },
  { key: 'qr', label: 'Card' },
];

const parseAmount = (value: string): number => {
  const normalized = value.replace(/[^\d]/g, '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  onClose,
  onSubmitPayment,
  totalAmount,
}) => {
  const [amounts, setAmounts] = React.useState<Record<PaymentMethod, string>>({
    cash: '',
    qr: '',
    visa: '',
  });
  const [activeMethods, setActiveMethods] = React.useState<PaymentMethod[]>(['cash']);

  React.useEffect(() => {
    if (!visible) return;
    setAmounts({
      cash: String(totalAmount),
      qr: '',
      visa: '',
    });
    setActiveMethods(['cash']);
  }, [totalAmount, visible]);

  const totalPaid = METHODS.reduce((sum, method) => sum + parseAmount(amounts[method.key]), 0);
  const remaining = totalAmount - totalPaid;

  const toggleMethod = (method: PaymentMethod) => {
    setActiveMethods((prev) => {
      if (prev.includes(method)) {
        setAmounts((current) => ({
          ...current,
          [method]: '',
        }));
        return prev.filter((item) => item !== method);
      }

      setAmounts((current) => {
        if (parseAmount(current[method]) > 0) {
          return current;
        }

        const hasOtherAmount = METHODS.some((item) => parseAmount(current[item.key]) > 0);
        return {
          ...current,
          [method]: hasOtherAmount ? current[method] : String(totalAmount),
        };
      });

      return [...prev, method];
    });
  };

  const submitPayment = () => {
    if (totalPaid < totalAmount) {
      Alert.alert('Pembayaran kurang', `Sisa pembayaran ${formatPrice(totalAmount - totalPaid)}.`);
      return;
    }

    const payments: PaymentLine[] = METHODS.map((method) => ({
      id: `${method.key}-${Date.now()}`,
      method: method.key,
      amount: parseAmount(amounts[method.key]),
    })).filter((item) => item.amount > 0);

    if (payments.length === 0) {
      Alert.alert('Pembayaran kosong', 'Isi nominal pembayaran terlebih dahulu.');
      return;
    }

    onSubmitPayment({ payments });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>Metode Pembayaran</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.closeBtnText}>x</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Tagihan</Text>
                <Text style={styles.totalValue}>{formatPrice(totalAmount)}</Text>
              </View>

              <View style={styles.methodTable}>
                <View style={styles.methodTableBodyRow}>
                  {METHODS.map((method, index) => {
                    const isActive = activeMethods.includes(method.key);
                    return (
                      <TouchableOpacity
                        key={method.key}
                        style={[
                          styles.methodTableBodyCell,
                          index < METHODS.length - 1 && styles.methodTableCellDivider,
                          isActive && styles.methodTableBodyCellActive,
                        ]}
                        onPress={() => toggleMethod(method.key)}
                      >
                        <Text
                          style={[
                            styles.methodTableBodyText,
                            isActive && styles.methodTableBodyTextActive,
                          ]}
                        >
                          {method.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {METHODS.filter((method) => activeMethods.includes(method.key)).map((method) => (
                <View key={method.key} style={styles.row}>
                  <Text style={styles.label}>{method.label}</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={amounts[method.key]}
                    onChangeText={(value) =>
                      setAmounts((prev) => ({
                        ...prev,
                        [method.key]: value,
                      }))
                    }
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              ))}

              <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>Dibayar: {formatPrice(totalPaid)}</Text>
                <Text style={styles.summaryText}>
                  {remaining >= 0 ? 'Sisa' : 'Lebih'}: {formatPrice(Math.abs(remaining))}
                </Text>
              </View>

              <TouchableOpacity style={styles.payBtn} onPress={submitPayment}>
                <Text style={styles.payBtnText}>Bayar</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textGray,
  },
  totalCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 2,
  },
  totalLabel: {
    fontSize: 12,
    color: COLORS.textGray,
  },
  totalValue: {
    fontSize: 24,
    color: COLORS.primaryPurple,
    fontWeight: '800',
  },
  methodTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  methodTableBodyRow: {
    flexDirection: 'row',
  },
  methodTableBodyCell: {
    flex: 1,
    minHeight: 56,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  methodTableBodyCellActive: {
    backgroundColor: COLORS.lightPurple,
  },
  methodTableCellDivider: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  methodTableBodyText: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: '800',
  },
  methodTableBodyTextActive: {
    color: COLORS.primaryPurple,
  },
  label: {
    fontSize: 14,
    color: COLORS.textGray,
    fontWeight: '700',
    width: 90,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  amountInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    color: COLORS.textDark,
  },
  summaryCard: {
    padding: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    gap: 4,
  },
  summaryText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  payBtn: {
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryPurple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
