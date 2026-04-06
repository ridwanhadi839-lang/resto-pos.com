import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS, RADIUS } from '../../constants/theme';
import {
  getActiveThermalRoles,
  getThermalPrinterRoleLabel,
  SavedThermalTarget,
  ThermalDevice,
  ThermalPrinterRole,
  ThermalPrinterSetupMode,
} from '../../services/thermalPrinterService';
import { ProductMixSection, TillSummaryReport } from '../../utils/reporting';
import {
  CALENDAR_WEEKDAYS,
  formatDateLabel,
  formatReportAmount,
  getMoreSectionLabel,
  MoreSection,
  MORE_MENU_ITEMS,
  needsReportDate,
  PrintableReportSection,
} from './posScreen.constants';

type CalendarDay = {
  key: string;
  label: string;
};

type ReportCalendarMonth = {
  key: string;
  label: string;
  days: Array<CalendarDay | null>;
};

interface POSMoreModalProps {
  visible: boolean;
  moreSection: MoreSection | null;
  selectedReportDate: string | null;
  reportCalendarMonth: ReportCalendarMonth;
  tillSummaryReport: TillSummaryReport;
  productMix: ProductMixSection[];
  thermalAvailable: boolean;
  thermalDisabledMessage: string;
  printerSetupMode: ThermalPrinterSetupMode;
  activePrinterRoles: ThermalPrinterRole[];
  savedPrinters: Record<ThermalPrinterRole, SavedThermalTarget | null>;
  loadingPrinter: boolean;
  devices: ThermalDevice[];
  onClose: () => void;
  onSelectSection: (section: MoreSection) => void;
  onBack: () => void;
  onPickReportDate: (dateKey: string) => void;
  onClearSelectedReportDate: () => void;
  onChangeReportMonth: (offset: number) => void;
  onPrintReport: (section: PrintableReportSection) => void | Promise<void>;
  onScanPrinters: () => void | Promise<void>;
  onChangePrinterSetupMode: (mode: ThermalPrinterSetupMode) => void | Promise<void>;
  onDisconnectPrinter: (role: ThermalPrinterRole) => void | Promise<void>;
  onConnectPrinter: (device: ThermalDevice, role: ThermalPrinterRole) => void | Promise<void>;
  onRunBluetoothCheck: (role: ThermalPrinterRole) => void | Promise<void>;
  onOpenLogout: () => void;
}

const getProductMixTotals = (productMix: ProductMixSection[]) =>
  productMix.reduce(
    (sum, section) => ({
      qty: sum.qty + section.items.reduce((itemSum, item) => itemSum + item.qty, 0),
      amount: sum.amount + section.items.reduce((itemSum, item) => itemSum + item.amount, 0),
    }),
    { qty: 0, amount: 0 }
  );

export const POSMoreModal: React.FC<POSMoreModalProps> = ({
  visible,
  moreSection,
  selectedReportDate,
  reportCalendarMonth,
  tillSummaryReport,
  productMix,
  thermalAvailable,
  thermalDisabledMessage,
  printerSetupMode,
  activePrinterRoles,
  savedPrinters,
  loadingPrinter,
  devices,
  onClose,
  onSelectSection,
  onBack,
  onPickReportDate,
  onClearSelectedReportDate,
  onChangeReportMonth,
  onPrintReport,
  onScanPrinters,
  onChangePrinterSetupMode,
  onDisconnectPrinter,
  onConnectPrinter,
  onRunBluetoothCheck,
  onOpenLogout,
}) => {
  const productMixTotals = getProductMixTotals(productMix);
  const bluetoothCheckRoles = getActiveThermalRoles(printerSetupMode);

  const renderSavedPrinterAssignments = () => (
    <View style={styles.moreAssignmentGrid}>
      {activePrinterRoles.map((role) => {
        const savedPrinter = savedPrinters[role];
        return (
          <View key={role} style={styles.morePrinterAssignmentCard}>
            <Text style={styles.morePrinterAssignmentTitle}>
              {getThermalPrinterRoleLabel(role, printerSetupMode)}
            </Text>
            <Text style={styles.morePrinterAssignmentValue}>
              {savedPrinter?.deviceName ?? 'Belum tersambung'}
            </Text>
            <Text style={styles.morePrinterAssignmentTarget}>
              {savedPrinter?.target ?? 'Pilih printer dari hasil scan di bawah.'}
            </Text>
            {savedPrinter ? (
              <TouchableOpacity
                style={[styles.moreDangerButton, styles.moreAssignmentDisconnectButton]}
                onPress={() => onDisconnectPrinter(role)}
                disabled={!thermalAvailable}
              >
                <Text style={styles.moreDangerButtonText}>Disconnect</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  const renderReportCalendar = () => (
    <View style={styles.moreContentWrap}>
      <Text style={styles.moreContentHeading}>Pilih Tanggal</Text>
      <Text style={styles.moreContentSub}>
        Pilih salah satu tanggal dari bulan yang sedang ditampilkan.
      </Text>

      <View style={styles.monthCalendarCard}>
        <View style={styles.monthNavigationRow}>
          <TouchableOpacity style={styles.calendarNavButton} onPress={() => onChangeReportMonth(-1)}>
            <Text style={styles.calendarNavButtonText}>{'<'}</Text>
          </TouchableOpacity>

          <Text style={styles.monthCalendarTitle}>{reportCalendarMonth.label}</Text>

          <TouchableOpacity style={styles.calendarNavButton} onPress={() => onChangeReportMonth(1)}>
            <Text style={styles.calendarNavButtonText}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.monthWeekHeader}>
          {CALENDAR_WEEKDAYS.map((weekday) => (
            <Text key={weekday} style={styles.monthWeekdayText}>
              {weekday}
            </Text>
          ))}
        </View>

        <View style={styles.monthDaysGrid}>
          {reportCalendarMonth.days.map((day, index) =>
            day ? (
              <TouchableOpacity
                key={day.key}
                style={styles.dayCellButton}
                onPress={() => onPickReportDate(day.key)}
              >
                <Text style={styles.dayCellText}>{day.label}</Text>
              </TouchableOpacity>
            ) : (
              <View key={`${reportCalendarMonth.key}-blank-${index}`} style={styles.dayCellBlank} />
            )
          )}
        </View>
      </View>
    </View>
  );

  const renderMoreContent = (section: MoreSection) => {
    if (section === 'till-summary') {
      return (
        <View style={styles.moreContentWrap}>
          <Text style={styles.moreContentHeading}>Till Summary</Text>
          <Text style={styles.moreContentSub}>
            Ringkasan order yang sudah dibayar pada{' '}
            {selectedReportDate ? formatDateLabel(selectedReportDate) : '-'}.
          </Text>

          <View style={styles.moreActionRow}>
            <TouchableOpacity style={styles.morePrimaryButton} onPress={() => onPrintReport('till-summary')}>
              <Text style={styles.morePrimaryButtonText}>Print Till Summary</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.receiptTableCard}>
            <Text style={styles.receiptTitle}>Order Summary</Text>
            <Text style={styles.receiptMeta}>
              Business Date: {selectedReportDate ? formatDateLabel(selectedReportDate) : '-'}
            </Text>
            <Text style={styles.receiptMeta}>Printed: {tillSummaryReport.printedAt}</Text>

            <Text style={styles.receiptSectionTitle}>General</Text>
            <View style={styles.receiptHeaderRow}>
              <Text style={[styles.receiptHeaderText, styles.receiptItemColumn]}>Item</Text>
              <Text style={[styles.receiptHeaderText, styles.receiptQtyColumn]}>Qty</Text>
              <Text style={[styles.receiptHeaderText, styles.receiptAmountColumn]}>Amount</Text>
            </View>
            {tillSummaryReport.rows.map((row, index) => (
              <View
                key={row.label}
                style={[styles.receiptDataRow, index === tillSummaryReport.rows.length - 1 && styles.receiptRowLast]}
              >
                <Text style={[styles.receiptItemText, styles.receiptItemColumn]}>{row.label}</Text>
                <Text style={[styles.receiptValueText, styles.receiptQtyColumn]}>
                  {row.qty > 0 ? row.qty : '-'}
                </Text>
                <Text style={[styles.receiptValueText, styles.receiptAmountColumn]}>
                  {formatReportAmount(row.amount)}
                </Text>
              </View>
            ))}

            <Text style={styles.receiptSectionTitle}>Order Types</Text>
            <View style={styles.receiptHeaderRow}>
              <Text style={[styles.receiptHeaderText, styles.receiptItemColumn]}>Item</Text>
              <Text style={[styles.receiptHeaderText, styles.receiptQtyColumn]}>Qty</Text>
              <Text style={[styles.receiptHeaderText, styles.receiptAmountColumn]}>Amount</Text>
            </View>
            {tillSummaryReport.orderTypes.map((row, index) => (
              <View
                key={row.label}
                style={[
                  styles.receiptDataRow,
                  index === tillSummaryReport.orderTypes.length - 1 && styles.receiptRowLast,
                ]}
              >
                <Text style={[styles.receiptItemText, styles.receiptItemColumn]}>{row.label}</Text>
                <Text style={[styles.receiptValueText, styles.receiptQtyColumn]}>{row.qty}</Text>
                <Text style={[styles.receiptValueText, styles.receiptAmountColumn]}>
                  {formatReportAmount(row.amount)}
                </Text>
              </View>
            ))}

            <Text style={styles.receiptSectionTitle}>Payments</Text>
            <View style={styles.receiptHeaderRow}>
              <Text style={[styles.receiptHeaderText, styles.receiptItemColumn]}>Item</Text>
              <Text style={[styles.receiptHeaderText, styles.receiptQtyColumn]}>Qty</Text>
              <Text style={[styles.receiptHeaderText, styles.receiptAmountColumn]}>Amount</Text>
            </View>
            {tillSummaryReport.payments.length === 0 ? (
              <Text style={styles.moreEmptyText}>Belum ada payment pada tanggal ini.</Text>
            ) : (
              tillSummaryReport.payments.map((row, index) => (
                <View
                  key={row.label}
                  style={[
                    styles.receiptDataRow,
                    index === tillSummaryReport.payments.length - 1 && styles.receiptRowLast,
                  ]}
                >
                  <Text style={[styles.receiptItemText, styles.receiptItemColumn]}>{row.label}</Text>
                  <Text style={[styles.receiptValueText, styles.receiptQtyColumn]}>{row.qty}</Text>
                  <Text style={[styles.receiptValueText, styles.receiptAmountColumn]}>
                    {formatReportAmount(row.amount)}
                  </Text>
                </View>
              ))
            )}

            <Text style={styles.receiptSectionTitle}>Cancel Reasons</Text>
            <View style={styles.receiptHeaderRow}>
              <Text style={[styles.receiptHeaderText, styles.receiptItemColumn]}>Item</Text>
              <Text style={[styles.receiptHeaderText, styles.receiptQtyColumn]}>Qty</Text>
              <Text style={[styles.receiptHeaderText, styles.receiptAmountColumn]}>Amount</Text>
            </View>
            {tillSummaryReport.cancelReasons.length === 0 ? (
              <Text style={styles.moreEmptyText}>Belum ada data cancel pada tanggal ini.</Text>
            ) : (
              tillSummaryReport.cancelReasons.map((row, index) => (
                <View
                  key={row.label}
                  style={[
                    styles.receiptDataRow,
                    index === tillSummaryReport.cancelReasons.length - 1 && styles.receiptRowLast,
                  ]}
                >
                  <Text style={[styles.receiptItemText, styles.receiptItemColumn]}>{row.label}</Text>
                  <Text style={[styles.receiptValueText, styles.receiptQtyColumn]}>{row.qty}</Text>
                  <Text style={[styles.receiptValueText, styles.receiptAmountColumn]}>
                    {formatReportAmount(row.amount)}
                  </Text>
                </View>
              ))
            )}

            <View style={[styles.receiptDataRow, styles.receiptTotalRow]}>
              <Text style={[styles.receiptTotalText, styles.receiptItemColumn]}>Total Payments</Text>
              <Text style={[styles.receiptTotalText, styles.receiptQtyColumn]}>
                {tillSummaryReport.totalPayments.qty}
              </Text>
              <Text style={[styles.receiptTotalText, styles.receiptAmountColumn]}>
                {formatReportAmount(tillSummaryReport.totalPayments.amount)}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (section === 'product-mix') {
      return (
        <View style={styles.moreContentWrap}>
          <Text style={styles.moreContentHeading}>Product Mix</Text>
          <Text style={styles.moreContentSub}>
            Produk terlaris dari order yang sudah dibayar pada{' '}
            {selectedReportDate ? formatDateLabel(selectedReportDate) : '-'}.
          </Text>

          <View style={styles.moreActionRow}>
            <TouchableOpacity style={styles.morePrimaryButton} onPress={() => onPrintReport('product-mix')}>
              <Text style={styles.morePrimaryButtonText}>Print Product Mix</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.receiptTableCard}>
            <Text style={styles.receiptTitle}>Product Mix</Text>
            <Text style={styles.receiptMeta}>
              Business Date: {selectedReportDate ? formatDateLabel(selectedReportDate) : '-'}
            </Text>
            <Text style={styles.receiptMeta}>Printed: {new Date().toLocaleString('id-ID')}</Text>

            <Text style={styles.receiptSectionTitle}>Products</Text>

            {productMix.length === 0 ? (
              <Text style={styles.moreEmptyText}>Belum ada data product mix.</Text>
            ) : (
              productMix.map((section) => (
                <View key={section.id} style={styles.receiptCategorySection}>
                  <Text style={styles.receiptCategoryTitle}>{section.name}</Text>
                  <View style={styles.receiptHeaderRow}>
                    <Text style={[styles.receiptHeaderText, styles.receiptItemColumn]}>Item</Text>
                    <Text style={[styles.receiptHeaderText, styles.receiptQtyColumn]}>Qty</Text>
                    <Text style={[styles.receiptHeaderText, styles.receiptAmountColumn]}>Amount</Text>
                  </View>
                  {section.items.map((item, index) => (
                    <View
                      key={item.id}
                      style={[
                        styles.receiptDataRow,
                        index === section.items.length - 1 && styles.receiptRowLast,
                      ]}
                    >
                      <Text style={[styles.receiptItemText, styles.receiptItemColumn]}>{item.name}</Text>
                      <Text style={[styles.receiptValueText, styles.receiptQtyColumn]}>{item.qty}</Text>
                      <Text style={[styles.receiptValueText, styles.receiptAmountColumn]}>
                        {formatReportAmount(item.amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            )}

            <View style={[styles.receiptDataRow, styles.receiptTotalRow]}>
              <Text style={[styles.receiptTotalText, styles.receiptItemColumn]}>Total Items</Text>
              <Text style={[styles.receiptTotalText, styles.receiptQtyColumn]}>{productMixTotals.qty}</Text>
              <Text style={[styles.receiptTotalText, styles.receiptAmountColumn]}>
                {formatReportAmount(productMixTotals.amount)}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (section === 'bluetooth-printer') {
      return (
        <View style={styles.moreContentWrap}>
          <Text style={styles.moreContentHeading}>Bluetooth Printer</Text>
          <Text style={styles.moreContentSub}>
            Status module: {thermalAvailable ? 'ready' : 'disabled on web'}
          </Text>
          <Text style={styles.moreContentSub}>
            Pilih dulu berapa printer yang dipakai, lalu hubungkan setiap printer ke role yang aktif.
          </Text>
          {!thermalAvailable ? (
            <View style={styles.moreDisabledCard}>
              <Text style={styles.moreDisabledTitle}>Fitur native only</Text>
              <Text style={styles.moreDisabledText}>{thermalDisabledMessage}</Text>
            </View>
          ) : null}

          <View style={styles.moreModeSelectorWrap}>
            <Text style={styles.moreModeSelectorLabel}>Jumlah printer aktif</Text>
            <View style={styles.moreModeSelectorRow}>
              {[1, 2, 3].map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.moreModeChip,
                    printerSetupMode === mode && styles.moreModeChipActive,
                  ]}
                  onPress={() => onChangePrinterSetupMode(mode as ThermalPrinterSetupMode)}
                >
                  <Text
                    style={[
                      styles.moreModeChipText,
                      printerSetupMode === mode && styles.moreModeChipTextActive,
                    ]}
                  >
                    {mode} Printer
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.moreModeDescription}>
              {printerSetupMode === 1
                ? 'Semua receipt kasir dan kitchen akan memakai Main Cashier.'
                : printerSetupMode === 2
                  ? 'Main Cashier dipakai untuk pembayaran, sedangkan semua kitchen ticket memakai Kitchen Shared.'
                  : 'Main Cashier dipakai untuk pembayaran, kitchen dine in dan take away masing-masing memakai printer sendiri.'}
            </Text>
          </View>

          {renderSavedPrinterAssignments()}

          <View style={styles.moreActionRow}>
            <TouchableOpacity
              style={[styles.morePrimaryButton, !thermalAvailable && styles.moreActionDisabled]}
              onPress={onScanPrinters}
              disabled={!thermalAvailable}
            >
              <Text style={styles.morePrimaryButtonText}>
                {loadingPrinter ? 'Scanning...' : 'Scan Bluetooth'}
              </Text>
            </TouchableOpacity>
          </View>

          {devices.length === 0 ? (
            <Text style={styles.moreEmptyText}>
              {thermalAvailable ? 'Belum ada printer hasil scan.' : 'Scan bluetooth dimatikan di web.'}
            </Text>
          ) : (
            <View style={styles.moreTable}>
              {devices.map((device, index) => (
                <View
                  key={device.target}
                  style={[styles.moreDeviceRow, index === devices.length - 1 && styles.moreTableRowLast]}
                >
                  <View style={styles.moreDeviceInfo}>
                    <Text style={styles.moreTableLabel}>{device.deviceName}</Text>
                    <Text style={styles.moreDeviceTarget}>{device.target}</Text>
                  </View>
                  <View style={styles.moreDeviceActions}>
                    {activePrinterRoles.map((role) => (
                      <TouchableOpacity
                        key={`${device.target}-${role}`}
                        style={[styles.moreDeviceAssignButton, !thermalAvailable && styles.moreActionDisabled]}
                        onPress={() => onConnectPrinter(device, role)}
                        disabled={!thermalAvailable}
                      >
                        <Text style={styles.moreDeviceAssignButtonText}>
                          {role === 'main'
                            ? 'Main'
                            : role === 'dine-in' && printerSetupMode === 2
                              ? 'Kitchen'
                              : role === 'dine-in'
                                ? 'Dine In'
                                : 'Take Away'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.moreCheckSection}>
            <Text style={styles.moreSectionCaption}>Test Printer</Text>
            <Text style={styles.moreContentSub}>
              {thermalAvailable
                ? 'Tes koneksi printer langsung dari halaman settings bluetooth.'
                : thermalDisabledMessage}
            </Text>

            <View style={styles.moreCheckGrid}>
              {bluetoothCheckRoles.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[styles.moreCheckCard, !thermalAvailable && styles.moreCheckCardDisabled]}
                  onPress={() => onRunBluetoothCheck(role)}
                  disabled={!thermalAvailable}
                >
                  <Text style={styles.moreCheckTitle}>
                    {getThermalPrinterRoleLabel(role, printerSetupMode)}
                  </Text>
                  <Text style={styles.moreCheckText}>
                    {role === 'main'
                      ? 'Cetak test koneksi untuk printer utama cashier.'
                      : role === 'dine-in' && printerSetupMode === 2
                        ? 'Cetak test koneksi untuk kitchen shared.'
                        : role === 'dine-in'
                          ? 'Cetak test koneksi untuk kitchen dine in.'
                          : 'Cetak test koneksi untuk kitchen take away.'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.moreModalOverlay}>
        <View style={styles.moreModalCard}>
          <View style={styles.moreModalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.moreModalHeaderAction}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.moreModalTitle}>
              {moreSection ? getMoreSectionLabel(moreSection) : 'More'}
            </Text>
            <View style={styles.moreModalHeaderSpacer} />
          </View>

          {moreSection == null ? (
            <ScrollView
              style={styles.moreModalBody}
              contentContainerStyle={styles.moreModalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.moreModalTable}>
                {MORE_MENU_ITEMS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.moreModalRow}
                    onPress={() => onSelectSection(item.id)}
                  >
                    <Text style={styles.moreModalRowText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.moreModalRow, styles.moreModalLogoutRow]}
                  onPress={onOpenLogout}
                >
                  <Text style={[styles.moreModalRowText, styles.moreModalLogoutText]}>Logout</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.moreModalBody}
              contentContainerStyle={styles.moreDetailContent}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity style={styles.moreBackButton} onPress={onBack}>
                <Text style={styles.moreBackButtonText}>Back</Text>
              </TouchableOpacity>

              {needsReportDate(moreSection) && !selectedReportDate ? (
                renderReportCalendar()
              ) : (
                <>
                  {needsReportDate(moreSection) && selectedReportDate ? (
                    <View style={styles.moreDateCard}>
                      <View>
                        <Text style={styles.moreDateLabel}>Tanggal</Text>
                        <Text style={styles.moreDateValue}>{formatDateLabel(selectedReportDate)}</Text>
                      </View>
                      <TouchableOpacity style={styles.moreSecondaryButton} onPress={onClearSelectedReportDate}>
                        <Text style={styles.moreSecondaryButtonText}>Ganti Tanggal</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {renderMoreContent(moreSection)}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  moreTableRowLast: {
    borderBottomWidth: 0,
  },
  moreTableLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  moreActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  moreModeSelectorWrap: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  moreModeSelectorLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  moreModeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moreModeChip: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  moreModeChipActive: {
    borderColor: COLORS.primaryPurple,
    backgroundColor: COLORS.lightPurple,
  },
  moreModeChipText: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  moreModeChipTextActive: {
    color: COLORS.primaryPurple,
  },
  moreModeDescription: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
    lineHeight: 18,
  },
  moreAssignmentGrid: {
    gap: 10,
  },
  morePrinterAssignmentCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 6,
  },
  morePrinterAssignmentTitle: {
    fontSize: 13,
    color: COLORS.textGray,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  morePrinterAssignmentValue: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  morePrinterAssignmentTarget: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
    lineHeight: 18,
  },
  moreAssignmentDisconnectButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    height: 36,
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
  moreDeviceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    maxWidth: 220,
  },
  moreDeviceAssignButton: {
    minWidth: 64,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  moreDeviceAssignButtonText: {
    fontSize: 11,
    color: COLORS.primaryPurple,
    fontWeight: '800',
  },
  moreDeviceTarget: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '600',
  },
  moreCheckGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moreCheckSection: {
    gap: 10,
  },
  moreCheckCard: {
    width: '48%',
    minHeight: 140,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    justifyContent: 'space-between',
  },
  moreCheckCardDisabled: {
    opacity: 0.45,
  },
  moreCheckTitle: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '800',
  },
  moreSectionCaption: {
    fontSize: 12,
    color: COLORS.textGray,
    fontWeight: '700',
    textTransform: 'uppercase',
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
  monthCalendarCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
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
