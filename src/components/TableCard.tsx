import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Table, TableStatus } from '../types';
import { COLORS, RADIUS } from '../constants/theme';

interface TableCardProps {
  table: Table;
  onPress: (table: Table) => void;
}

const STATUS_CONFIG: Record<TableStatus, { color: string; bg: string; label: string }> = {
  available: { color: COLORS.success, bg: '#D1FAE5', label: 'Available' },
  occupied: { color: COLORS.error, bg: '#FEE2E2', label: 'Occupied' },
  reserved: { color: COLORS.warning, bg: '#FEF3C7', label: 'Reserved' },
};

export const TableCard: React.FC<TableCardProps> = ({ table, onPress }) => {
  const config = STATUS_CONFIG[table.status];

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: config.color }]}
      onPress={() => onPress(table)}
      activeOpacity={0.8}
    >
      <Text style={styles.tableNum}>Table {table.number}</Text>
      <Text style={styles.seats}>{table.seats} seats</Text>
      <View style={[styles.badge, { backgroundColor: config.bg }]}>
        <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 100,
    justifyContent: 'center',
  },
  tableNum: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  seats: {
    fontSize: 12,
    color: COLORS.textGray,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
