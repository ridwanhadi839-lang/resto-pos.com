import React from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { COLORS, RADIUS } from '../constants/theme';
import { CATEGORIES, formatPrice } from '../data/mockData';
import {
  clearSavedThermalTarget,
  discoverThermalPrinters,
  getThermalFeatureMessage,
  getSavedThermalTarget,
  isThermalFeatureEnabled,
  printThermalTestReceipt,
  PrinterTransport,
  saveThermalTarget,
  ThermalDevice,
} from '../services/thermalPrinterService';

type Section = 'account' | 'settings' | 'sales';
type ReportView = 'till-summary' | 'product-mix';

const MENU_ITEMS: Array<{ id: Section; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = [
  { id: 'account', label: 'Informasi Akun', icon: 'account-circle-outline' },
  { id: 'settings', label: 'Pengaturan', icon: 'cog-outline' },
  { id: 'sales', label: 'Sales Report', icon: 'chart-bar-stacked' },
];

export const MoreScreen: React.FC = () => {
  const user = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const orders = useOrderStore((s) => s.orders);

  const [section, setSection] = React.useState<Section>('sales');
  const [reportView, setReportView] = React.useState<ReportView>('till-summary');
  const [transport, setTransport] = React.useState<PrinterTransport>('bluetooth');
  const [devices, setDevices] = React.useState<ThermalDevice[]>([]);
  const [savedDeviceName, setSavedDeviceName] = React.useState('');
  const [savedTarget, setSavedTarget] = React.useState('');
  const [loadingPrinter, setLoadingPrinter] = React.useState(false);

  const thermalAvailable = isThermalFeatureEnabled();
  const thermalDisabledMessage = getThermalFeatureMessage();
  const paidOrders = React.useMemo(
    () => orders.filter((order) => order.status === 'paid' || order.status === 'sent_to_kitchen'),
    [orders]
  );

  const tillSummary = React.useMemo(() => {
    const summary = {
      'dine-in': { label: 'Dine In', total: 0, count: 0 },
      takeaway: { label: 'Take Away', total: 0, count: 0 },
      delivery: { label: 'Delivery', total: 0, count: 0 },
      'drive-thru': { label: 'Drive Thru', total: 0, count: 0 },
    };

    paidOrders.forEach((order) => {
      const key = order.orderType === 'delivery' ? 'delivery' : order.orderType;
      summary[key].total += order.total;
      summary[key].count += 1;
    });

    return Object.values(summary);
  }, [paidOrders]);

  const productMix = React.useMemo(() => {
    const categoryNameById = new Map(CATEGORIES.map((category) => [category.id, category.name]));
    const grouped = new Map<string, Map<string, number>>();

    paidOrders.forEach((order) => {
      order.items.forEach((item) => {
        const categoryName = categoryNameById.get(item.product.categoryId) ?? 'Lainnya';
        if (!grouped.has(categoryName)) {
          grouped.set(categoryName, new Map<string, number>());
        }
        const productGroup = grouped.get(categoryName)!;
        productGroup.set(item.product.name, (productGroup.get(item.product.name) ?? 0) + item.quantity);
      });
    });

    return Array.from(grouped.entries()).map(([category, products]) => ({
      category,
      products: Array.from(products.entries())
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty),
    }));
  }, [paidOrders]);

  const refreshSavedTarget = React.useCallback(async () => {
    const saved = await getSavedThermalTarget('main');
    if (!saved) {
      setSavedDeviceName('');
      setSavedTarget('');
      return;
    }

    setSavedDeviceName(saved.deviceName);
    setSavedTarget(saved.target);
  }, []);

  React.useEffect(() => {
    refreshSavedTarget();
  }, [refreshSavedTarget]);

  const scanPrinters = async () => {
    if (!thermalAvailable) {
      Alert.alert('Thermal printer tidak tersedia', thermalDisabledMessage);
      return;
    }
    setLoadingPrinter(true);
    try {
      const found = await discoverThermalPrinters(transport, 7000);
      setDevices(found);
      if (found.length === 0) {
        Alert.alert('Scan selesai', 'Tidak ada printer ditemukan.');
      }
    } catch (error) {
      Alert.alert('Scan gagal', error instanceof Error ? error.message : 'Scan printer gagal.');
    } finally {
      setLoadingPrinter(false);
    }
  };

  const connectPrinter = async (device: ThermalDevice) => {
    try {
      await saveThermalTarget('main', device.target, device.deviceName);
      await refreshSavedTarget();
      Alert.alert('Printer tersimpan', `${device.deviceName} siap dipakai.`);
    } catch (error) {
      Alert.alert('Gagal', error instanceof Error ? error.message : 'Gagal menyimpan printer.');
    }
  };

  const disconnectPrinter = async () => {
    await clearSavedThermalTarget('main');
    await refreshSavedTarget();
    Alert.alert('Printer dilepas', 'Koneksi printer thermal dihapus.');
  };

  const testPrint = async () => {
    try {
      await printThermalTestReceipt();
      Alert.alert('Berhasil', 'Test print dikirim ke thermal printer.');
    } catch (error) {
      Alert.alert('Gagal print', error instanceof Error ? error.message : 'Test print gagal.');
    }
  };

  const roleLabel =
    user?.role === 'supervisor' ? 'Supervisor' : user?.role === 'kitchen' ? 'Kitchen' : 'Cashier';

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primaryPurple} barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <Text style={styles.headerSub}>Pengaturan, akun, dan laporan penjualan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.quickMenuRow}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.quickMenuCard, section === item.id && styles.quickMenuCardActive]}
              onPress={() => setSection(item.id)}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={20}
                color={section === item.id ? COLORS.white : COLORS.primaryPurple}
              />
              <Text
                style={[styles.quickMenuText, section === item.id && styles.quickMenuTextActive]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {section === 'account' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informasi Akun</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama</Text>
              <Text style={styles.infoValue}>{user?.name ?? 'Cashier'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{roleLabel}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>PIN Login Aktif</Text>
            </View>
          </View>
        ) : null}

        {section === 'settings' ? (
          <View style={styles.card}>
          <Text style={styles.cardTitle}>Pengaturan Printer</Text>
            <Text style={styles.helperText}>
              Module: {thermalAvailable ? 'ready' : 'disabled on web'}
            </Text>
            <Text style={styles.helperText}>
              Connected: {savedDeviceName ? `${savedDeviceName} (${savedTarget})` : '-'}
            </Text>
            {!thermalAvailable ? (
              <Text style={styles.helperText}>{thermalDisabledMessage}</Text>
            ) : null}

            <View style={styles.transportRow}>
              <TouchableOpacity
                style={[styles.transportBtn, transport === 'bluetooth' && styles.transportBtnActive]}
                onPress={() => setTransport('bluetooth')}
              >
                <Text
                  style={[
                    styles.transportBtnText,
                    transport === 'bluetooth' && styles.transportBtnTextActive,
                  ]}
                >
                  Bluetooth
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.transportBtn, transport === 'lan' && styles.transportBtnActive]}
                onPress={() => setTransport('lan')}
              >
                <Text
                  style={[
                    styles.transportBtnText,
                    transport === 'lan' && styles.transportBtnTextActive,
                  ]}
                >
                  LAN
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.primaryBtn, !thermalAvailable && styles.disabledButton]}
                onPress={scanPrinters}
                disabled={loadingPrinter || !thermalAvailable}
              >
                <Text style={styles.primaryBtnText}>{loadingPrinter ? 'Scanning...' : 'Scan'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, !thermalAvailable && styles.disabledButton]}
                onPress={testPrint}
                disabled={!thermalAvailable}
              >
                <Text style={styles.secondaryBtnText}>Test Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dangerBtn, !thermalAvailable && styles.disabledButton]}
                onPress={disconnectPrinter}
                disabled={!thermalAvailable}
              >
                <Text style={styles.dangerBtnText}>Disconnect</Text>
              </TouchableOpacity>
            </View>

            {devices.map((device) => (
              <View key={device.target} style={styles.deviceRow}>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.deviceName}</Text>
                  <Text style={styles.deviceTarget}>{device.target}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.connectBtn, !thermalAvailable && styles.disabledButton]}
                  onPress={() => connectPrinter(device)}
                  disabled={!thermalAvailable}
                >
                  <Text style={styles.connectBtnText}>Connect</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {section === 'sales' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sales Report</Text>
            <View style={styles.reportTabRow}>
              <TouchableOpacity
                style={[styles.reportTab, reportView === 'till-summary' && styles.reportTabActive]}
                onPress={() => setReportView('till-summary')}
              >
                <Text
                  style={[
                    styles.reportTabText,
                    reportView === 'till-summary' && styles.reportTabTextActive,
                  ]}
                >
                  Till Summary
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reportTab, reportView === 'product-mix' && styles.reportTabActive]}
                onPress={() => setReportView('product-mix')}
              >
                <Text
                  style={[
                    styles.reportTabText,
                    reportView === 'product-mix' && styles.reportTabTextActive,
                  ]}
                >
                  Product Mix
                </Text>
              </TouchableOpacity>
            </View>

            {reportView === 'till-summary' ? (
              <View style={styles.summaryGrid}>
                {tillSummary.map((item) => (
                  <View key={item.label} style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>{item.label}</Text>
                    <Text style={styles.summaryValue}>{formatPrice(item.total)}</Text>
                    <Text style={styles.summarySub}>{item.count} transaksi</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.mixWrap}>
                {productMix.length === 0 ? (
                  <Text style={styles.helperText}>Belum ada data penjualan produk.</Text>
                ) : (
                  productMix.map((group) => (
                    <View key={group.category} style={styles.mixCard}>
                      <Text style={styles.mixTitle}>{group.category}</Text>
                      {group.products.map((product) => (
                        <View key={product.name} style={styles.mixRow}>
                          <Text style={styles.mixName}>{product.name}</Text>
                          <Text style={styles.mixQty}>{product.qty} pcs</Text>
                        </View>
                      ))}
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() =>
            Alert.alert('Logout', 'Keluar dari aplikasi?', [
              { text: 'Batal', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: () => logout() },
            ])
          }
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  quickMenuRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickMenuCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickMenuCardActive: {
    backgroundColor: COLORS.primaryPurple,
    borderColor: COLORS.primaryPurple,
  },
  quickMenuText: {
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickMenuTextActive: {
    color: COLORS.white,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  transportRow: {
    flexDirection: 'row',
    gap: 8,
  },
  transportBtn: {
    flex: 1,
    height: 36,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  transportBtnActive: {
    borderColor: COLORS.primaryPurple,
    backgroundColor: COLORS.lightPurple,
  },
  transportBtnText: {
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: '700',
  },
  transportBtnTextActive: {
    color: COLORS.primaryPurple,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  dangerBtn: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 10,
    gap: 10,
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: '700',
  },
  deviceTarget: {
    color: COLORS.textGray,
    fontSize: 11,
  },
  connectBtn: {
    backgroundColor: COLORS.lightPurple,
    borderRadius: RADIUS.sm,
    height: 32,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectBtnText: {
    color: COLORS.primaryPurple,
    fontSize: 12,
    fontWeight: '700',
  },
  reportTabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reportTab: {
    flex: 1,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportTabActive: {
    backgroundColor: COLORS.primaryPurple,
    borderColor: COLORS.primaryPurple,
  },
  reportTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  reportTabTextActive: {
    color: COLORS.white,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  summarySub: {
    fontSize: 11,
    color: COLORS.primaryPurple,
    fontWeight: '700',
  },
  mixWrap: {
    gap: 10,
  },
  mixCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 6,
  },
  mixTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  mixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mixName: {
    color: COLORS.textGray,
    fontSize: 12,
    fontWeight: '600',
  },
  mixQty: {
    color: COLORS.primaryPurple,
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
