import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { COLORS, RADIUS } from '../../constants/theme';
import { CancelReason } from '../../types';
import { VOID_REASONS } from './posScreen.constants';

interface POSVoidModalProps {
  visible: boolean;
  selectedReason: CancelReason | null;
  onSelectReason: (reason: CancelReason) => void;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export const POSVoidModal: React.FC<POSVoidModalProps> = ({
  visible,
  selectedReason,
  onSelectReason,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>Void Cart</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.close}>Close</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.bodyText}>
                Semua item di cart akan dihapus. Lanjutkan void cart ini?
              </Text>

              <View style={styles.reasonWrap}>
                <Text style={styles.reasonLabel}>Pilih alasan</Text>
                <View style={styles.reasonRow}>
                  {VOID_REASONS.map((reason) => {
                    const isActive = selectedReason === reason;
                    return (
                      <TouchableOpacity
                        key={reason}
                        style={[styles.reasonButton, isActive && styles.reasonButtonActive]}
                        onPress={() => onSelectReason(reason)}
                      >
                        <Text
                          style={[styles.reasonButtonText, isActive && styles.reasonButtonTextActive]}
                        >
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
                  <Text style={styles.secondaryText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dangerButton, !selectedReason && styles.dangerButtonDisabled]}
                  onPress={onConfirm}
                  disabled={!selectedReason}
                >
                  <Text style={styles.primaryText}>Hapus</Text>
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
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 18,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  close: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textGray,
  },
  bodyText: {
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: '600',
    lineHeight: 20,
  },
  reasonWrap: {
    gap: 8,
  },
  reasonLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '700',
  },
  reasonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reasonButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  reasonButtonActive: {
    borderColor: COLORS.primaryPurple,
    backgroundColor: COLORS.lightPurple,
  },
  reasonButtonText: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '700',
    textAlign: 'center',
  },
  reasonButtonTextActive: {
    color: COLORS.primaryPurple,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
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
  secondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  dangerButton: {
    flex: 1.2,
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  primaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
});
