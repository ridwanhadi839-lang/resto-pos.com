import React, { useCallback, useEffect, useState } from 'react';
import * as Print from 'expo-print';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useTillStore } from '../store/tillStore';
import { formatPrice } from '../data/mockData';
import { ActionCard, CancelReason, Order, PaymentLine, Product } from '../types';

import { ProductConfiguratorModal } from '../components/ProductConfiguratorModal';
import { PaymentModal } from '../components/PaymentModal';
import { CashierReceiptPreviewModal } from '../components/CashierReceiptPreviewModal';
import { KitchenTicketPreviewModal } from '../components/KitchenTicketPreviewModal';
import { COLORS, RADIUS } from '../constants/theme';
import { createDefaultPayments } from '../services/orderService';
import { recordVoidAuditLog } from '../services/orderAuditService';
import { printCashierReceipt, printKitchenTicket } from '../services/printService';
import {
  deleteCustomerContact,
  getSavedCustomerContacts,
  upsertCustomerContact,
} from '../services/customerContactService';
import {
  clearSavedThermalTarget,
  discoverThermalPrinters,
  getSavedThermalSetupMode,
  getSavedThermalTargets,
  getActiveThermalRoles,
  getThermalFeatureMessage,
  getThermalPrinterRoleLabel,
  isThermalFeatureEnabled,
  printThermalText,
  SavedThermalTarget,
  saveThermalSetupMode,
  saveThermalTarget,
  ThermalDevice,
  ThermalPrinterRole,
  ThermalPrinterSetupMode,
} from '../services/thermalPrinterService';
import { CartItem, SavedCustomerContact } from '../types';
import {
  DISCOUNT_STEPS,
  getOrderModeLabel,
  MoreSection,
  needsReportDate,
  PrintableReportSection,
} from './pos/posScreen.constants';
import { POSCartPanel } from './pos/POSCartPanel';
import { POSMenuPanel } from './pos/POSMenuPanel';
import { POSMoreModal } from './pos/POSMoreModal';
import { POSVoidModal } from './pos/POSVoidModal';
import { usePOSCatalog } from './pos/usePOSCatalog';
import { usePOSReports } from './pos/usePOSReports';

const EMPTY_SAVED_PRINTERS: Record<ThermalPrinterRole, SavedThermalTarget | null> = {
  main: null,
  'dine-in': null,
  takeaway: null,
};

export const POSScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { width: windowWidth } = useWindowDimensions();
  const user = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const isOrdersView = route.name === 'Orders';
  const isTablesView = route.name === 'Tables';
  const contentWidth = Math.max(0, windowWidth - 30);
  const cartWidth =
    windowWidth < 1280
      ? Math.max(300, Math.min(380, contentWidth * 0.32))
      : Math.max(320, contentWidth * 0.3);
  const cartPanelStyle = {
    width: cartWidth,
    flexGrow: 0,
    flexShrink: 0,
  };
  const menuPanelStyle = {
    flex: 1,
    minWidth: 0,
  };

  const {
    orderNumber,
    orderType,
    tableNumber,
    customer,
    items,
    orderNote,
    pendingCarts,
    sourceOrderStatus,
    discountPercent,
    setOrderType,
    setCustomer,
    setOrderNote,
    setDiscountPercent,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    resetCartState,
    subtotal,
    discount,
    tax,
    total,
    itemCount,
  } = useCartStore();

  const orders = useOrderStore((s) => s.orders);
  const cancelLogs = useOrderStore((s) => s.cancelLogs);
  const createOrder = useOrderStore((s) => s.createOrder);
  const addCancelLog = useOrderStore((s) => s.addCancelLog);
  const resetOrderState = useOrderStore((s) => s.resetOrderState);
  const isOnline = useOrderStore((s) => s.isOnline);
  const isSyncing = useOrderStore((s) => s.isSyncing);
  const pendingSyncCount = useOrderStore((s) => s.pendingSyncCount);
  const lastSyncError = useOrderStore((s) => s.lastSyncError);
  const syncPendingOrders = useOrderStore((s) => s.syncPendingOrders);
  const openTillEntry = useTillStore((s) => s.openTillEntry);
  const setOpenTill = useTillStore((s) => s.setOpenTill);
  const resetTillState = useTillStore((s) => s.resetTillState);
  const isPaidOrderLoaded = sourceOrderStatus === 'paid';

  const {
    categories,
    products,
    filteredProducts,
    isCatalogLoading,
    catalogError,
    selectedCategoryId,
    setSelectedCategoryId,
  } = usePOSCatalog();
  const selectedCategoryName =
    categories.find((category) => category.id === selectedCategoryId)?.name ?? '';
  const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);
  const [isPaymentSubmitting, setPaymentSubmitting] = useState(false);
  const [isNotesModalVisible, setNotesModalVisible] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [isVoidModalVisible, setVoidModalVisible] = useState(false);
  const [selectedVoidReason, setSelectedVoidReason] = useState<CancelReason | null>(null);
  const [isReceiptPreviewVisible, setReceiptPreviewVisible] = useState(false);
  const [isPrintingReceipt, setPrintingReceipt] = useState(false);
  const [receiptPreviewOrder, setReceiptPreviewOrder] = useState<Order | null>(null);
  const [isKitchenPreviewVisible, setKitchenPreviewVisible] = useState(false);
  const [isPrintingKitchen, setPrintingKitchen] = useState(false);
  const [kitchenPreviewOrder, setKitchenPreviewOrder] = useState<Order | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [savedContacts, setSavedContacts] = useState<SavedCustomerContact[]>([]);
  const [isSavingContact, setSavingContact] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [isCustomerModalVisible, setCustomerModalVisible] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [customerDraft, setCustomerDraft] = useState({ name: '', phone: '' });
  const [isMoreModalVisible, setMoreModalVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isLoggingOut, setLoggingOut] = useState(false);
  const [moreSection, setMoreSection] = useState<MoreSection | null>(null);
  const [devices, setDevices] = useState<ThermalDevice[]>([]);
  const [savedPrinters, setSavedPrinters] = useState<
    Record<ThermalPrinterRole, SavedThermalTarget | null>
  >(EMPTY_SAVED_PRINTERS);
  const [printerSetupMode, setPrinterSetupMode] = useState<ThermalPrinterSetupMode>(3);
  const [loadingPrinter, setLoadingPrinter] = useState(false);
  const [isOpenTillModalVisible, setOpenTillModalVisible] = useState(false);
  const [openTillAmountInput, setOpenTillAmountInput] = useState('');

  const thermalAvailable = isThermalFeatureEnabled();
  const thermalDisabledMessage = getThermalFeatureMessage();
  const activePrinterRoles = getActiveThermalRoles(printerSetupMode);
  const hasCustomerInfo = Boolean(customer.name.trim() || customer.phone.trim());
  const {
    selectedReportDate,
    setSelectedReportDate,
    reportCalendarMonth,
    tillSummaryReport,
    productMix,
    resetReportCalendar,
    changeReportMonth,
    buildTillSummaryPrintHtml,
    buildProductMixPrintHtml,
  } = usePOSReports({
    orders,
    cancelLogs,
    openTillEntries: openTillEntry ? [openTillEntry] : [],
    categories,
    products,
    restaurantName: user?.restaurantName,
  });

  const loadSavedContacts = useCallback(async () => {
    try {
      const contacts = await getSavedCustomerContacts();
      setSavedContacts(contacts);
      return contacts;
    } catch (error) {
      console.warn(
        'Gagal memuat customer contacts:',
        error instanceof Error ? error.message : error
      );
      setSavedContacts([]);
      return [];
    }
  }, []);
  const refreshSavedPrinters = useCallback(async () => {
    const [saved, savedMode] = await Promise.all([
      getSavedThermalTargets(),
      getSavedThermalSetupMode(),
    ]);
    setSavedPrinters(saved);
    setPrinterSetupMode(savedMode);
    return { saved, savedMode };
  }, []);

  useEffect(() => {
    if (route.name !== 'Home') return;

    if (user && !openTillEntry) {
      setOpenTillModalVisible(true);
      return;
    }

    setOpenTillModalVisible(false);
  }, [openTillEntry, route.name, user]);

  const makeOrderInput = (
    status: 'pending' | 'paid' | 'sent_to_kitchen',
    payments: PaymentLine[]
  ) => ({
    orderNumber,
    items: [...items],
    orderNote,
    subtotal: subtotal(),
    discount: discount(),
    tax: tax(),
    total: total(),
    splitBillCount: 1,
    payments,
    status,
    orderType,
    customer: { ...customer },
    tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
    cashierUserId: user?.id,
  });

  const makeDraftOrder = (
    status: 'pending' | 'paid' | 'sent_to_kitchen',
    payments: PaymentLine[]
  ): Order => ({
    id: `draft-${Date.now()}`,
    orderNumber,
    items: [...items],
    orderNote,
    subtotal: subtotal(),
    discount: discount(),
    tax: tax(),
    total: total(),
    splitBillCount: 1,
    payments,
    status,
    orderType,
    customer: { ...customer },
    tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
    createdAt: new Date().toISOString(),
    synced: false,
  });

  const handlePaymentSuccess = async (payload: {
    payments: PaymentLine[];
  }) => {
    if (isPaymentSubmitting) return;

    setPaymentSubmitting(true);
    try {
      if (customer.name.trim() && customer.phone.trim()) {
        try {
          const contacts = await upsertCustomerContact({
            name: customer.name,
            phone: customer.phone,
          });
          setSavedContacts(contacts);
        } catch (error) {
          console.warn(
            'Gagal menyimpan customer contact saat pembayaran:',
            error instanceof Error ? error.message : error
          );
        }
      }

      const savedOrder = await createOrder(makeOrderInput('paid', payload.payments));
      setPaymentModalVisible(false);

      clearCart();
      Alert.alert(
        'Pembayaran tersimpan',
        `Invoice ${savedOrder.orderNumber}\nTotal ${formatPrice(savedOrder.total)}`
      );
    } catch (error) {
      Alert.alert(
        'Pembayaran gagal',
        error instanceof Error ? error.message : 'Order gagal diproses oleh backend.'
      );
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const cycleDiscount = () => {
    const currentIndex = DISCOUNT_STEPS.indexOf(discountPercent);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % DISCOUNT_STEPS.length : 1;
    const nextValue = DISCOUNT_STEPS[nextIndex];
    setDiscountPercent(nextValue);
  };

  const printCashierDraft = async () => {
    if (items.length === 0) {
      Alert.alert('Cart kosong', 'Tambahkan menu dulu sebelum print invoice.');
      return;
    }
    setReceiptPreviewOrder(makeDraftOrder('paid', createDefaultPayments(total())));
    setReceiptPreviewVisible(true);
  };

  const handlePrintReceiptConfirm = async () => {
    if (!receiptPreviewOrder) return;

    setPrintingReceipt(true);
    try {
      await printCashierReceipt(
        receiptPreviewOrder,
        user?.name ?? 'Cashier',
        user?.restaurantName,
        true
      );
      setReceiptPreviewVisible(false);
      Alert.alert('Print kasir', 'Invoice kasir berhasil dikirim ke printer.');
    } catch (error) {
      Alert.alert('Print gagal', error instanceof Error ? error.message : 'Print invoice gagal.');
    } finally {
      setPrintingReceipt(false);
    }
  };

  const handleConfiguredProduct = (payload: {
    product: Product;
    quantity: number;
    options: string[];
    note?: string;
  }) => {
    if (editingCartItem) {
      updateItem(editingCartItem.id, payload);
      setEditingCartItem(null);
      setSelectedProduct(null);
      return;
    }

    addItem(payload);
    setSelectedProduct(null);
  };

  const handleProductPress = (product: Product) => {
    setEditingCartItem(null);
    setSelectedProduct(product);
  };

  const handleCartItemEdit = (item: CartItem) => {
    setEditingCartItem(item);
    setSelectedProduct(item.product);
  };

  const handleConfiguratorClose = () => {
    setSelectedProduct(null);
    setEditingCartItem(null);
  };

  const handleOpenNotes = () => {
    setNotesDraft(orderNote);
    setNotesModalVisible(true);
  };

  const handleSaveNotes = () => {
    setOrderNote(notesDraft);
    setNotesModalVisible(false);
  };

  const handleOpenCustomerModal = () => {
    setCustomerDraft({
      name: customer.name,
      phone: customer.phone,
    });
    setIsAddingCustomer(savedContacts.length === 0);
    setCustomerModalVisible(true);
    void loadSavedContacts().then((contacts) => {
      setIsAddingCustomer(contacts.length === 0);
    });
  };

  const handleSelectSavedContact = (contact: SavedCustomerContact) => {
    setCustomer({
      name: contact.name,
      phone: contact.phone,
    });
    setCustomerDraft({
      name: contact.name,
      phone: contact.phone,
    });
    setCustomerModalVisible(false);
  };

  const handleApplyCustomer = () => {
    setCustomer({
      name: customerDraft.name.trim(),
      phone: customerDraft.phone.trim(),
    });
    setCustomerModalVisible(false);
  };

  const handleSaveCustomerContact = async () => {
    if (!customerDraft.name.trim() || !customerDraft.phone.trim()) {
      Alert.alert('Data belum lengkap', 'Isi nama dan no telepon dulu.');
      return;
    }

    setSavingContact(true);
    try {
      const contacts = await upsertCustomerContact({
        name: customerDraft.name,
        phone: customerDraft.phone,
      });
      setSavedContacts(contacts);
      setCustomer({
        name: customerDraft.name.trim(),
        phone: customerDraft.phone.trim(),
      });
      setIsAddingCustomer(false);
      setCustomerModalVisible(false);
      Alert.alert('Kontak tersimpan', 'Nama dan no telepon bisa dipakai lagi.');
    } catch (error) {
      Alert.alert(
        'Kontak gagal disimpan',
        error instanceof Error ? error.message : 'Customer belum berhasil disimpan.'
      );
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteSavedContact = async (contact: SavedCustomerContact) => {
    setDeletingContactId(contact.id);
    try {
      const contacts = await deleteCustomerContact(contact.id);
      setSavedContacts(contacts);

      if (customer.name === contact.name && customer.phone === contact.phone) {
        setCustomer({ name: '', phone: '' });
      }

      setIsAddingCustomer(contacts.length === 0);
    } catch (error) {
      Alert.alert(
        'Hapus gagal',
        error instanceof Error ? error.message : 'Customer belum berhasil dihapus.'
      );
    } finally {
      setDeletingContactId(null);
    }
  };

  const scanPrinters = async () => {
    if (!thermalAvailable) {
      Alert.alert('Bluetooth tidak tersedia', thermalDisabledMessage);
      return;
    }

    setLoadingPrinter(true);
    try {
      const found = await discoverThermalPrinters('bluetooth', 7000);
      setDevices(found);
      if (found.length === 0) {
        Alert.alert('Scan selesai', 'Belum ada printer bluetooth yang ditemukan.');
      }
    } catch (error) {
      Alert.alert('Scan gagal', error instanceof Error ? error.message : 'Scan printer gagal.');
    } finally {
      setLoadingPrinter(false);
    }
  };

  const connectPrinter = async (device: ThermalDevice, role: ThermalPrinterRole) => {
    try {
      await saveThermalTarget(role, device.target, device.deviceName);
      await refreshSavedPrinters();
      Alert.alert(
        'Printer tersimpan',
        `${getThermalPrinterRoleLabel(role, printerSetupMode)} sekarang memakai ${device.deviceName}.`
      );
    } catch (error) {
      Alert.alert('Gagal', error instanceof Error ? error.message : 'Gagal menyimpan printer.');
    }
  };

  const disconnectPrinter = async (role: ThermalPrinterRole) => {
    await clearSavedThermalTarget(role);
    await refreshSavedPrinters();
    Alert.alert(
      'Printer dilepas',
      `Koneksi ${getThermalPrinterRoleLabel(role, printerSetupMode)} dihapus.`
    );
  };

  const changePrinterSetupMode = async (mode: ThermalPrinterSetupMode) => {
    try {
      await saveThermalSetupMode(mode);
      setPrinterSetupMode(mode);
      const modeLabel =
        mode === 1 ? '1 printer' : mode === 2 ? '2 printer (cashier + kitchen shared)' : '3 printer';
      Alert.alert('Mode printer disimpan', `Bluetooth printer sekarang memakai mode ${modeLabel}.`);
    } catch (error) {
      Alert.alert(
        'Mode printer gagal disimpan',
        error instanceof Error ? error.message : 'Coba simpan ulang mode printer.'
      );
    }
  };

  const handlePrintReport = async (section: PrintableReportSection) => {
    if (!selectedReportDate) {
      Alert.alert('Tanggal belum dipilih', 'Pilih tanggal dulu sebelum print report.');
      return;
    }

    try {
      const html =
        section === 'till-summary' ? buildTillSummaryPrintHtml() : buildProductMixPrintHtml();
      await Print.printAsync({ html });
    } catch (error) {
      Alert.alert(
        'Print gagal',
        error instanceof Error ? error.message : 'Report tidak berhasil dicetak.'
      );
    }
  };

  const runBluetoothCheck = async (role: ThermalPrinterRole) => {
    if (!thermalAvailable) {
      Alert.alert('Bluetooth tidak tersedia', thermalDisabledMessage);
      return;
    }

    const roleLabel = getThermalPrinterRoleLabel(role, printerSetupMode);
    try {
      await printThermalText([
        'RestoPOS',
        `Bluetooth Check - ${roleLabel}`,
        `${new Date().toLocaleString('id-ID')}`,
        '------------------------------',
        `${roleLabel} printer connection OK`,
      ], role);
      Alert.alert('Berhasil', `Test koneksi bluetooth ${roleLabel} berhasil dikirim.`);
    } catch (error) {
      Alert.alert(
        'Cek koneksi gagal',
        error instanceof Error ? error.message : 'Test koneksi bluetooth gagal.'
      );
    }
  };

  const printKitchenDraft = async () => {
    if (items.length === 0) {
      Alert.alert('Cart kosong', 'Tambahkan menu dulu sebelum print kitchen.');
      return;
    }
    setKitchenPreviewOrder(makeDraftOrder('sent_to_kitchen', []));
    setKitchenPreviewVisible(true);
  };

  const handlePrintKitchenConfirm = async () => {
    if (!kitchenPreviewOrder) return;

    setPrintingKitchen(true);
    try {
      await printKitchenTicket(kitchenPreviewOrder, true, {
        cashierName: user?.name ?? 'Cashier',
        restaurantName: user?.restaurantName,
      });
      setKitchenPreviewVisible(false);
      Alert.alert(
        'Kitchen print',
        `Ticket kitchen ${getOrderModeLabel(orderType)} berhasil dikirim.`
      );
    } catch (error) {
      Alert.alert('Print gagal', error instanceof Error ? error.message : 'Print kitchen gagal.');
    } finally {
      setPrintingKitchen(false);
    }
  };

  const handleLogoutConfirm = async () => {
    setLoggingOut(true);
    try {
      resetCartState();
      resetOrderState();
      resetTillState();
      setMoreModalVisible(false);
      setMoreSection(null);
      setSelectedReportDate(null);
      setLogoutModalVisible(false);
      await logout();
    } catch (error) {
      Alert.alert('Logout gagal', error instanceof Error ? error.message : 'Coba lagi.');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleOpenTillSubmit = () => {
    const normalizedValue = openTillAmountInput.replace(/[^\d]/g, '');
    if (!normalizedValue) {
      Alert.alert('Open till belum valid', 'Masukkan jumlah uang awal di cashier.');
      return;
    }

    const amount = Number(normalizedValue);
    if (!Number.isFinite(amount) || amount < 0) {
      Alert.alert('Open till belum valid', 'Jumlah uang awal harus berupa angka yang valid.');
      return;
    }

    setOpenTill({
      amount,
      cashierName: user?.name,
      cashierUserId: user?.id,
    });
    setOpenTillAmountInput('');
    setOpenTillModalVisible(false);
    Alert.alert('Till dibuka', `Open till tersimpan sebesar ${formatPrice(amount)}.`);
  };

  const handleActionCardPress = async (card: ActionCard) => {
    switch (card.label) {
      case 'Print':
        await printCashierDraft();
        return;
      case 'Kitchen':
        await printKitchenDraft();
        return;
      case 'Void':
        if (items.length === 0) {
          Alert.alert('Cart kosong', 'Belum ada item yang bisa di-void.');
          return;
        }
        setSelectedVoidReason(null);
        setVoidModalVisible(true);
        return;
      case 'Discount':
        cycleDiscount();
        return;
      case 'Notes':
        handleOpenNotes();
        return;
      case 'More':
        setMoreSection(null);
        setSelectedReportDate(null);
        resetReportCalendar();
        await refreshSavedPrinters();
        setMoreModalVisible(true);
        return;
      default:
        return;
    }
  };

  const handlePayPress = () => {
    if (isPaidOrderLoaded) {
      Alert.alert('Order sudah dibayar', 'Order ini tidak bisa diproses bayar dua kali.');
      return;
    }
    setPaymentModalVisible(true);
  };

  const handleRetrySync = async () => {
    const result = await syncPendingOrders();
    if (result.ok) {
      Alert.alert(
        'Sync selesai',
        result.syncedCount > 0
          ? `${result.syncedCount} pending order berhasil dikirim.`
          : 'Tidak ada pending order yang perlu dikirim.'
      );
      return;
    }

    Alert.alert(
      'Sync belum selesai',
      result.error ?? `${result.pendingCount} pending order belum terkirim.`
    );
  };

  const handleCloseVoidModal = () => {
    setVoidModalVisible(false);
    setSelectedVoidReason(null);
  };

  const handleVoidConfirm = async () => {
    if (!selectedVoidReason) return;

    const cancelPayload = {
      orderNumber,
      reason: selectedVoidReason,
      subtotal: subtotal(),
      discount: discount(),
      tax: tax(),
      total: total(),
      itemCount: itemCount(),
      orderType,
      customerName: customer.name,
      customerPhone: customer.phone,
    };

    try {
      await recordVoidAuditLog(cancelPayload);
    } catch (error) {
      console.warn(
        'Gagal mengirim audit log void ke backend:',
        error instanceof Error ? error.message : error
      );
    }

    addCancelLog({
      orderNumber: cancelPayload.orderNumber,
      reason: cancelPayload.reason,
      subtotal: cancelPayload.subtotal,
      discount: cancelPayload.discount,
      tax: cancelPayload.tax,
      total: cancelPayload.total,
      itemCount: cancelPayload.itemCount,
    });
    clearCart();
    handleCloseVoidModal();
  };

  const handleCloseMoreModal = () => {
    setMoreModalVisible(false);
    setMoreSection(null);
    setSelectedReportDate(null);
  };

  const handleBackMoreModal = () => {
    setMoreSection(null);
    setSelectedReportDate(null);
  };

  const handleSelectMoreSection = (section: MoreSection) => {
    setMoreSection(section);
    if (needsReportDate(section)) {
      setSelectedReportDate(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor={COLORS.primaryPurple} barStyle="light-content" />

      <View style={styles.body}>
        <POSCartPanel
          style={cartPanelStyle}
          orderNumber={orderNumber}
          orderType={orderType}
          customer={customer}
          hasCustomerInfo={hasCustomerInfo}
          discountPercent={discountPercent}
          pendingCartCount={pendingCarts.length}
          pendingSyncCount={pendingSyncCount}
          isOnline={isOnline}
          isSyncing={isSyncing}
          lastSyncError={lastSyncError}
          isPaidOrderLoaded={isPaidOrderLoaded}
          orderNote={orderNote}
          items={items}
          itemCount={itemCount()}
          subtotal={subtotal()}
          discount={discount()}
          tax={tax()}
          total={total()}
          onSelectOrderType={setOrderType}
          onOpenCustomerModal={handleOpenCustomerModal}
          onEditCartItem={handleCartItemEdit}
          onRemoveCartItem={removeItem}
          onPay={handlePayPress}
          onRetrySync={handleRetrySync}
          payDisabled={items.length === 0 || isPaidOrderLoaded}
        />

        <POSMenuPanel
          style={menuPanelStyle}
          isOrdersView={isOrdersView}
          isTablesView={isTablesView}
          navigation={navigation}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          isCatalogLoading={isCatalogLoading}
          catalogError={catalogError}
          filteredProducts={filteredProducts}
          onSelectCategory={setSelectedCategoryId}
          onProductPress={handleProductPress}
          onActionCardPress={handleActionCardPress}
        />
      </View>

      <PaymentModal
        visible={isPaymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSubmitPayment={handlePaymentSuccess}
        totalAmount={total()}
        isSubmitting={isPaymentSubmitting}
      />

      <Modal
        visible={route.name === 'Home' && isOpenTillModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.notesOverlay}>
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Text style={styles.notesTitle}>Open Till</Text>
            </View>

            <Text style={styles.voidModalText}>
              Masukkan jumlah uang awal yang tersedia di cashier sebelum mulai transaksi.
            </Text>

            <View style={styles.phoneInputGroup}>
              <Text style={styles.phoneInputLabel}>Uang Awal Cashier</Text>
              <TextInput
                value={openTillAmountInput}
                onChangeText={(value) => setOpenTillAmountInput(value.replace(/[^\d]/g, ''))}
                placeholder="Contoh: 100000"
                keyboardType="numeric"
                style={styles.phoneInput}
              />
            </View>

            <View style={styles.notesActions}>
              <TouchableOpacity style={styles.notesPrimaryButton} onPress={handleOpenTillSubmit}>
                <Text style={styles.notesPrimaryText}>Buka Till</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <POSVoidModal
        visible={isVoidModalVisible}
        selectedReason={selectedVoidReason}
        onSelectReason={setSelectedVoidReason}
        onClose={handleCloseVoidModal}
        onConfirm={handleVoidConfirm}
      />

      <Modal
        visible={isCustomerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomerModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCustomerModalVisible(false)}>
          <View style={styles.customerModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.customerModalCard}>
                <View style={styles.customerModalHeader}>
                  <TouchableOpacity
                    style={styles.customerModalHeaderAction}
                    onPress={() => {
                      if (isAddingCustomer && savedContacts.length > 0) {
                        setCustomerDraft({
                          name: customer.name,
                          phone: customer.phone,
                        });
                        setIsAddingCustomer(false);
                        return;
                      }

                      setCustomerDraft({ name: '', phone: '' });
                      setIsAddingCustomer(true);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={isAddingCustomer && savedContacts.length > 0 ? 'arrow-left' : 'plus'}
                      size={20}
                      color={COLORS.textDark}
                    />
                  </TouchableOpacity>
                  <View style={styles.customerModalHeaderContent}>
                    <Text style={styles.customerModalTitle}>Customer</Text>
                    <Text style={styles.customerModalSub}>
                      {isAddingCustomer
                        ? 'Tambahkan nama dan nomor telepon customer baru.'
                        : 'Pilih kontak yang sudah tersimpan di database customer.'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setCustomerModalVisible(false)}>
                    <Text style={styles.customerModalClose}>Close</Text>
                  </TouchableOpacity>
                </View>

                {isAddingCustomer ? (
                  <>
                    <View style={styles.phoneInputGroup}>
                      <Text style={styles.phoneInputLabel}>Nama</Text>
                      <TextInput
                        value={customerDraft.name}
                        onChangeText={(value) =>
                          setCustomerDraft((current) => ({ ...current, name: value }))
                        }
                        placeholder="Nama customer"
                        style={styles.phoneInput}
                      />
                    </View>

                    <View style={styles.phoneInputGroup}>
                      <Text style={styles.phoneInputLabel}>No Telepon</Text>
                      <TextInput
                        value={customerDraft.phone}
                        onChangeText={(value) =>
                          setCustomerDraft((current) => ({ ...current, phone: value }))
                        }
                        placeholder="08xxxxxxxxxx"
                        keyboardType="phone-pad"
                        style={styles.phoneInput}
                      />
                    </View>

                    <View style={styles.customerModalActions}>
                      <TouchableOpacity
                        style={styles.customerModalSecondaryButton}
                        onPress={() => {
                          if (savedContacts.length > 0) {
                            setIsAddingCustomer(false);
                            return;
                          }

                          setCustomerModalVisible(false);
                        }}
                      >
                        <Text style={styles.customerModalSecondaryText}>Batal</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.customerModalPrimaryButton}
                        onPress={handleSaveCustomerContact}
                        disabled={isSavingContact}
                      >
                        <Text style={styles.customerModalPrimaryText}>
                          {isSavingContact ? 'Saving...' : 'Simpan'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : savedContacts.length > 0 ? (
                  <View style={styles.savedContactsWrap}>
                    <Text style={styles.savedContactsTitle}>Kontak Tersimpan</Text>
                    <View style={styles.savedContactsTable}>
                      <View style={styles.savedContactsHeaderRow}>
                        <Text
                          style={[styles.savedContactsHeaderText, styles.savedContactNameColumn]}
                        >
                          Nama
                        </Text>
                        <Text
                          style={[styles.savedContactsHeaderText, styles.savedContactPhoneColumn]}
                        >
                          No Telepon
                        </Text>
                        <Text
                          style={[styles.savedContactsHeaderText, styles.savedContactActionColumn]}
                        >
                          Aksi
                        </Text>
                      </View>
                      <ScrollView
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.savedContactsTableBody}
                      >
                        {savedContacts.map((contact, index) => (
                          <View
                            key={contact.id}
                            style={[
                              styles.savedContactRow,
                              index === savedContacts.length - 1 && styles.savedContactRowLast,
                              customer.name === contact.name &&
                                customer.phone === contact.phone &&
                                styles.savedContactRowActive,
                            ]}
                          >
                            <TouchableOpacity
                              style={styles.savedContactSelectArea}
                              onPress={() => handleSelectSavedContact(contact)}
                            >
                              <Text
                                style={[styles.savedContactName, styles.savedContactNameColumn]}
                                numberOfLines={1}
                              >
                                {contact.name}
                              </Text>
                              <Text
                                style={[styles.savedContactPhone, styles.savedContactPhoneColumn]}
                              >
                                {contact.phone}
                              </Text>
                            </TouchableOpacity>
                            <View style={styles.savedContactActions}>
                              <TouchableOpacity
                                style={styles.savedContactDeleteButton}
                                onPress={() => handleDeleteSavedContact(contact)}
                                disabled={deletingContactId === contact.id}
                              >
                                <Text style={styles.savedContactDeleteText}>
                                  {deletingContactId === contact.id ? '...' : 'Hapus'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                ) : (
                  <View style={styles.customerEmptyState}>
                    <Text style={styles.customerEmptyStateTitle}>Belum ada kontak tersimpan</Text>
                    <Text style={styles.customerEmptyStateText}>
                      Tekan ikon + di kiri atas untuk menambahkan nama dan nomor telepon customer.
                    </Text>
                  </View>
                )}

                {!isAddingCustomer ? (
                  <View style={styles.customerModalActions}>
                    <TouchableOpacity
                      style={styles.customerModalSecondaryButton}
                      onPress={() => {
                        setCustomerDraft({ name: '', phone: '' });
                        setCustomer({ name: '', phone: '' });
                        setCustomerModalVisible(false);
                      }}
                    >
                      <Text style={styles.customerModalSecondaryText}>Kosongkan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.customerModalGhostButton}
                      onPress={handleApplyCustomer}
                    >
                      <Text style={styles.customerModalGhostText}>Gunakan Draft</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={isNotesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setNotesModalVisible(false)}>
          <View style={styles.notesOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.notesCard}>
                <View style={styles.notesHeader}>
                  <Text style={styles.notesTitle}>Order Notes</Text>
                  <TouchableOpacity onPress={() => setNotesModalVisible(false)}>
                    <Text style={styles.notesClose}>Close</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  value={notesDraft}
                  onChangeText={setNotesDraft}
                  placeholder="Tulis catatan order di sini"
                  multiline
                  textAlignVertical="top"
                  style={styles.notesInput}
                />

                <View style={styles.notesActions}>
                  <TouchableOpacity
                    style={styles.notesSecondaryButton}
                    onPress={() => {
                      setNotesDraft('');
                      setOrderNote('');
                      setNotesModalVisible(false);
                    }}
                  >
                    <Text style={styles.notesSecondaryText}>Hapus</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.notesPrimaryButton} onPress={handleSaveNotes}>
                    <Text style={styles.notesPrimaryText}>Simpan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <CashierReceiptPreviewModal
        visible={isReceiptPreviewVisible}
        order={receiptPreviewOrder}
        cashierName={user?.name ?? 'Cashier'}
        restaurantName={user?.restaurantName}
        isPrinting={isPrintingReceipt}
        onClose={() => {
          if (isPrintingReceipt) return;
          setReceiptPreviewVisible(false);
        }}
        onPrint={handlePrintReceiptConfirm}
      />

      <KitchenTicketPreviewModal
        visible={isKitchenPreviewVisible}
        order={kitchenPreviewOrder}
        cashierName={user?.name ?? 'Cashier'}
        restaurantName={user?.restaurantName}
        isPrinting={isPrintingKitchen}
        onClose={() => {
          if (isPrintingKitchen) return;
          setKitchenPreviewVisible(false);
        }}
        onPrint={handlePrintKitchenConfirm}
      />

      <ProductConfiguratorModal
        visible={selectedProduct != null}
        product={selectedProduct}
        activeCategoryName={selectedCategoryName}
        initialQuantity={editingCartItem?.quantity ?? 1}
        initialOptions={editingCartItem?.options ?? []}
        submitLabel={editingCartItem ? 'Simpan Perubahan' : 'Tambah ke Cart'}
        onClose={handleConfiguratorClose}
        onSubmit={handleConfiguredProduct}
      />

      <POSMoreModal
        visible={isMoreModalVisible}
        moreSection={moreSection}
        selectedReportDate={selectedReportDate}
        reportCalendarMonth={reportCalendarMonth}
        tillSummaryReport={tillSummaryReport}
        productMix={productMix}
        thermalAvailable={thermalAvailable}
        thermalDisabledMessage={thermalDisabledMessage}
        printerSetupMode={printerSetupMode}
        activePrinterRoles={activePrinterRoles}
        savedPrinters={savedPrinters}
        loadingPrinter={loadingPrinter}
        devices={devices}
        onClose={handleCloseMoreModal}
        onSelectSection={handleSelectMoreSection}
        onBack={handleBackMoreModal}
        onPickReportDate={setSelectedReportDate}
        onClearSelectedReportDate={() => setSelectedReportDate(null)}
        onChangeReportMonth={changeReportMonth}
        onPrintReport={handlePrintReport}
        onScanPrinters={scanPrinters}
        onChangePrinterSetupMode={changePrinterSetupMode}
        onDisconnectPrinter={disconnectPrinter}
        onConnectPrinter={connectPrinter}
        onRunBluetoothCheck={runBluetoothCheck}
        onOpenLogout={() => setLogoutModalVisible(true)}
      />

      <Modal
        visible={isLogoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (isLoggingOut) return;
          setLogoutModalVisible(false);
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            if (isLoggingOut) return;
            setLogoutModalVisible(false);
          }}
        >
          <View style={styles.notesOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.notesCard}>
                <View style={styles.notesHeader}>
                  <Text style={styles.notesTitle}>Logout</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (isLoggingOut) return;
                      setLogoutModalVisible(false);
                    }}
                  >
                    <Text style={styles.notesClose}>Close</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.voidModalText}>
                  Keluar dari aplikasi sekarang? Cart, pending, dan data order lokal akan dibersihkan.
                </Text>

                <View style={styles.notesActions}>
                  <TouchableOpacity
                    style={styles.notesSecondaryButton}
                    onPress={() => setLogoutModalVisible(false)}
                    disabled={isLoggingOut}
                  >
                    <Text style={styles.notesSecondaryText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.voidDangerButton, isLoggingOut && styles.voidDangerButtonDisabled]}
                    onPress={handleLogoutConfirm}
                    disabled={isLoggingOut}
                  >
                    <Text style={styles.notesPrimaryText}>
                      {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    padding: 10,
  },
  cartPanel: {
    alignSelf: 'stretch',
    minHeight: 0,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 10,
  },
  menuPanel: {
    minHeight: 0,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 12,
  },
  ordersPanel: {
    flex: 1,
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  menuContentWrap: {
    flex: 1,
    minHeight: 0,
    gap: 12,
  },
  ordersContentWrap: {
    flex: 1,
    minHeight: 0,
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
  customerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.26)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  customerModalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '82%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  customerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  customerModalHeaderAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerModalHeaderContent: {
    flex: 1,
  },
  customerModalTitle: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  customerModalSub: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
    maxWidth: 280,
    lineHeight: 18,
  },
  customerModalClose: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '700',
  },
  phoneInputGroup: {
    gap: 6,
  },
  phoneInputLabel: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  phoneInput: {
    height: 40,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: '600',
  },
  savedContactsWrap: {
    gap: 8,
  },
  savedContactsTitle: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  savedContactsTable: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  savedContactsHeaderRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  savedContactsHeaderText: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  savedContactsTableBody: {
    maxHeight: 260,
    paddingBottom: 2,
  },
  savedContactRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  savedContactRowLast: {
    borderBottomWidth: 0,
  },
  savedContactRowActive: {
    backgroundColor: COLORS.lightPurple,
  },
  savedContactNameColumn: {
    flex: 1.1,
    paddingRight: 12,
  },
  savedContactPhoneColumn: {
    flex: 1,
    paddingRight: 12,
  },
  savedContactActionColumn: {
    width: 88,
    textAlign: 'center',
  },
  savedContactSelectArea: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedContactActions: {
    width: 88,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  savedContactDeleteButton: {
    minWidth: 58,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  savedContactDeleteText: {
    fontSize: 11,
    color: COLORS.error,
    fontWeight: '800',
  },
  savedContactName: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  savedContactPhone: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  customerEmptyState: {
    minHeight: 160,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  customerEmptyStateTitle: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '800',
    textAlign: 'center',
  },
  customerEmptyStateText: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  customerModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  customerModalGhostButton: {
    flex: 1.1,
    height: 42,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerModalGhostText: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  customerModalSecondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerModalSecondaryText: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '700',
  },
  customerModalPrimaryButton: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerModalPrimaryText: {
    fontSize: 12,
    color: COLORS.white,
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categorySection: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  productGrid: {
    paddingBottom: 12,
    gap: 10,
  },
  productsList: {
    flex: 1,
  },
  productRow: {
    gap: 10,
  },
  productCardWrap: {
    flex: 1,
    maxWidth: '23%',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: COLORS.textGray,
    fontSize: 13,
    fontWeight: '600',
  },
  notesOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  notesCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 18,
    gap: 14,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  voidModalText: {
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: '600',
    lineHeight: 20,
  },
  voidReasonWrap: {
    gap: 8,
  },
  voidReasonLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '700',
  },
  voidReasonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  voidReasonButton: {
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
  voidReasonButtonActive: {
    borderColor: COLORS.primaryPurple,
    backgroundColor: COLORS.lightPurple,
  },
  voidReasonButtonText: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '700',
    textAlign: 'center',
  },
  voidReasonButtonTextActive: {
    color: COLORS.primaryPurple,
  },
  notesClose: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textGray,
  },
  notesInput: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    backgroundColor: COLORS.background,
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: '600',
  },
  notesActions: {
    flexDirection: 'row',
    gap: 10,
  },
  notesSecondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  notesSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  notesPrimaryButton: {
    flex: 1.2,
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  voidDangerButton: {
    flex: 1.2,
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voidDangerButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  moreModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  moreModalCard: {
    width: '100%',
    maxWidth: 560,
    minHeight: 440,
    maxHeight: '78%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  moreModalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 14,
  },
  moreModalHeaderAction: {
    width: 60,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textGray,
  },
  moreModalTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  moreModalHeaderSpacer: {
    width: 60,
  },
  moreModalBody: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  moreModalBodyContent: {
    paddingBottom: 12,
  },
  moreDetailContent: {
    padding: 16,
    gap: 14,
  },
  moreModalTable: {
    backgroundColor: COLORS.white,
  },
  moreModalRow: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  moreModalRowActive: {
    backgroundColor: COLORS.lightPurple,
  },
  moreModalRowText: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  moreModalLogoutRow: {
    backgroundColor: COLORS.background,
  },
  moreModalLogoutText: {
    color: COLORS.error,
    fontWeight: '700',
  },
  moreBackButton: {
    alignSelf: 'flex-start',
    minWidth: 72,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  moreBackButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  moreDateCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moreDateLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '700',
  },
  moreDateValue: {
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  moreContentWrap: {
    gap: 14,
  },
  moreContentHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  moreContentSub: {
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  moreSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moreSummaryCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 4,
  },
  moreSummaryLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '700',
  },
  moreSummaryValue: {
    fontSize: 18,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  moreSummarySub: {
    fontSize: 12,
    color: COLORS.primaryPurple,
    fontWeight: '700',
  },
  receiptTableCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  receiptTitle: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '800',
    textAlign: 'center',
  },
  receiptMeta: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '600',
    textAlign: 'center',
  },
  receiptSectionTitle: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '800',
    marginTop: 8,
  },
  receiptCategorySection: {
    gap: 6,
    marginTop: 8,
  },
  receiptCategoryTitle: {
    fontSize: 12,
    color: COLORS.primaryPurple,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  receiptHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 6,
  },
  receiptHeaderText: {
    fontSize: 11,
    color: COLORS.textGray,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  receiptDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  receiptRowLast: {
    borderBottomWidth: 0,
  },
  receiptItemColumn: {
    flex: 1.4,
  },
  receiptQtyColumn: {
    width: 56,
    textAlign: 'right',
  },
  receiptAmountColumn: {
    width: 92,
    textAlign: 'right',
  },
  receiptItemText: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  receiptValueText: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  receiptTotalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.textDark,
    borderBottomWidth: 0,
  },
  receiptTotalText: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  moreTable: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  moreTableRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 16,
  },
  moreTableRowLast: {
    borderBottomWidth: 0,
  },
  moreTableLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  moreTableValue: {
    fontSize: 13,
    color: COLORS.primaryPurple,
    fontWeight: '800',
  },
  moreActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  morePrimaryButton: {
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryPurple,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  moreActionDisabled: {
    opacity: 0.45,
  },
  morePrimaryButtonText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '700',
  },
  moreSecondaryButton: {
    minWidth: 90,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.lightPurple,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  moreSecondaryButtonText: {
    fontSize: 12,
    color: COLORS.primaryPurple,
    fontWeight: '700',
  },
  moreDangerButton: {
    height: 42,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  moreDangerButtonText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '700',
  },
  moreDeviceRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  moreDeviceInfo: {
    flex: 1,
    gap: 4,
  },
  moreDeviceTarget: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  moreCheckGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  moreCheckCard: {
    flex: 1,
    minHeight: 140,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    justifyContent: 'space-between',
  },
  moreCheckTitle: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  moreCheckText: {
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  moreEmptyText: {
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: '600',
    paddingVertical: 10,
  },
  monthCalendarCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  moreCheckCardDisabled: {
    opacity: 0.45,
  },
  moreDisabledCard: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 12,
    gap: 4,
  },
  moreDisabledTitle: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  moreDisabledText: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
    lineHeight: 18,
  },
  monthNavigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthCalendarTitle: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '800',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavButtonText: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  monthWeekHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthWeekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 10,
    color: COLORS.textGray,
    fontWeight: '700',
    marginBottom: 6,
  },
  monthDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  dayCellButton: {
    width: '14.28%',
    aspectRatio: 1,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellText: {
    fontSize: 10,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  dayCellBlank: {
    width: '14.28%',
    aspectRatio: 1,
  },
});
