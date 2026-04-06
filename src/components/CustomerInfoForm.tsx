import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

interface CustomerInfoFormProps {
  name: string;
  phone: string;
  receiptNo: string;
  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeReceipt: (value: string) => void;
}

export const CustomerInfoForm: React.FC<CustomerInfoFormProps> = ({
  name,
  phone,
  receiptNo,
  onChangeName,
  onChangePhone,
  onChangeReceipt,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onChangeName}
          placeholder="Customer name"
          placeholderTextColor={COLORS.textLight}
        />
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={onChangePhone}
          placeholder="Phone number"
          placeholderTextColor={COLORS.textLight}
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Receipt</Text>
        <TextInput
          style={[styles.input, styles.inputReceipt]}
          value={receiptNo}
          onChangeText={onChangeReceipt}
          placeholder="Receipt No."
          placeholderTextColor={COLORS.textLight}
          editable={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textGray,
    width: 44,
  },
  input: {
    flex: 1,
    height: 36,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    fontSize: 13,
    color: COLORS.textDark,
  },
  inputReceipt: {
    color: COLORS.primaryPurple,
    fontWeight: '600',
  },
});
