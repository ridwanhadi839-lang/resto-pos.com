import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TABLES } from '../data/mockData';
import { Table } from '../types';
import { TableCard } from '../components/TableCard';
import { AppFooterNav } from '../components/AppFooterNav';
import { COLORS } from '../constants/theme';

interface TablesScreenProps {
  embedded?: boolean;
}

export const TablesScreen: React.FC<TablesScreenProps> = ({ embedded = false }) => {
  const navigation = useNavigation<any>();
  const [tables, setTables] = useState(TABLES);

  const handleTablePress = (table: Table) => {
    const cycle = { available: 'occupied', occupied: 'reserved', reserved: 'available' } as const;
    setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, status: cycle[t.status] } : t)));
  };

  const available = tables.filter((t) => t.status === 'available').length;
  const occupied = tables.filter((t) => t.status === 'occupied').length;
  const reserved = tables.filter((t) => t.status === 'reserved').length;

  return (
    <View style={styles.container}>
      {!embedded ? <StatusBar backgroundColor={COLORS.primaryPurple} barStyle="light-content" /> : null}

      <View style={[styles.header, embedded && styles.headerEmbedded]}>
        <Text style={styles.headerTitle}>Table Management</Text>
        <View style={styles.headerStats}>
          <View style={[styles.statBadge, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.statText, { color: COLORS.success }]}>{available} Available</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.statText, { color: COLORS.error }]}>{occupied} Occupied</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.statText, { color: COLORS.warning }]}>{reserved} Reserved</Text>
          </View>
        </View>
      </View>

      <Text style={styles.tapHint}>Tap a table to cycle its status</Text>

      <View style={styles.contentWrap}>
        <FlatList
          style={styles.list}
          data={tables}
          keyExtractor={(item) => item.id}
          numColumns={4}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <View style={styles.tableWrapper}>
              <TableCard table={item} onPress={handleTablePress} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />

        {!embedded ? <AppFooterNav currentTab="Tables" navigation={navigation} compact /> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primaryPurple,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  headerEmbedded: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tapHint: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingVertical: 8,
  },
  contentWrap: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
  grid: {
    padding: 12,
    gap: 12,
  },
  row: {
    gap: 12,
  },
  tableWrapper: {
    flex: 1,
  },
});
