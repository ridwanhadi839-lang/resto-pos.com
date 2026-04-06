import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type PrinterTransport = 'bluetooth' | 'lan';
export type ThermalPrinterRole = 'main' | 'dine-in' | 'takeaway';
export type ThermalPrinterSetupMode = 1 | 2 | 3;

export interface ThermalDevice {
  target: string;
  deviceName: string;
  ipAddress?: string;
  macAddress?: string;
}

export interface SavedThermalTarget {
  role: ThermalPrinterRole;
  target: string;
  deviceName: string;
}

const PRINTER_STORAGE_KEYS: Record<
  ThermalPrinterRole,
  { target: string; name: string }
> = {
  main: {
    target: 'restopos:thermal:main:target',
    name: 'restopos:thermal:main:name',
  },
  'dine-in': {
    target: 'restopos:thermal:dine-in:target',
    name: 'restopos:thermal:dine-in:name',
  },
  takeaway: {
    target: 'restopos:thermal:takeaway:target',
    name: 'restopos:thermal:takeaway:name',
  },
};
const PRINTER_SETUP_MODE_KEY = 'restopos:thermal:setup-mode';

const loadEscPosModule = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('react-native-esc-pos-printer');
};

export const getThermalFeatureMessage = () =>
  Platform.OS === 'web'
    ? 'Printer bluetooth hanya tersedia di Android/iOS native build.'
    : 'Gunakan Dev Client atau native build untuk printer bluetooth.';

export const isThermalModuleAvailable = (): boolean => {
  try {
    const module = loadEscPosModule();
    return Boolean(module?.Printer && module?.PrintersDiscovery);
  } catch {
    return false;
  }
};

export const isThermalFeatureEnabled = (): boolean =>
  Platform.OS !== 'web' && isThermalModuleAvailable();

export const getThermalPrinterRoleLabel = (
  role: ThermalPrinterRole,
  setupMode: ThermalPrinterSetupMode = 3
) => {
  if (role === 'main') return 'Main Cashier';
  if (role === 'dine-in' && setupMode === 2) return 'Kitchen Shared';
  if (role === 'dine-in') return 'Kitchen Dine In';
  return 'Kitchen Take Away';
};

export const getActiveThermalRoles = (
  setupMode: ThermalPrinterSetupMode
): ThermalPrinterRole[] => {
  if (setupMode === 1) return ['main'];
  if (setupMode === 2) return ['main', 'dine-in'];
  return ['main', 'dine-in', 'takeaway'];
};

export const discoverThermalPrinters = async (
  transport: PrinterTransport,
  timeout = 6000
): Promise<ThermalDevice[]> => {
  if (!isThermalFeatureEnabled()) {
    throw new Error(getThermalFeatureMessage());
  }

  const escpos = loadEscPosModule();
  const { PrintersDiscovery, DiscoveryFilterOption } = escpos;

  const discovered: ThermalDevice[] = [];
  const unsubscribe = PrintersDiscovery.onDiscovery((devices: any[]) => {
    for (const rawDevice of devices ?? []) {
      if (!rawDevice?.target) continue;
      const exists = discovered.some((item) => item.target === rawDevice.target);
      if (exists) continue;
      discovered.push({
        target: rawDevice.target,
        deviceName: rawDevice.deviceName ?? 'Unknown Printer',
        ipAddress: rawDevice.ipAddress ?? undefined,
        macAddress: rawDevice.macAddress ?? rawDevice.bdAddress ?? undefined,
      });
    }
  });

  await PrintersDiscovery.start({
    timeout,
    autoStop: true,
    filterOption: {
      portType:
        transport === 'bluetooth'
          ? DiscoveryFilterOption.PORTTYPE_BLUETOOTH
          : DiscoveryFilterOption.PORTTYPE_TCP,
    },
  });

  await PrintersDiscovery.stop();
  unsubscribe?.();
  return discovered;
};

export const saveThermalTarget = async (
  role: ThermalPrinterRole,
  target: string,
  deviceName: string
) => {
  const storage = PRINTER_STORAGE_KEYS[role];
  await Promise.all([
    AsyncStorage.setItem(storage.target, target),
    AsyncStorage.setItem(storage.name, deviceName),
  ]);
};

export const getSavedThermalTarget = async (role: ThermalPrinterRole) => {
  const storage = PRINTER_STORAGE_KEYS[role];
  const [target, deviceNameRaw] = await Promise.all([
    AsyncStorage.getItem(storage.target),
    AsyncStorage.getItem(storage.name),
  ]);
  const deviceName = deviceNameRaw ?? `RestoPOS ${getThermalPrinterRoleLabel(role)}`;
  if (!target) return null;
  return { role, target, deviceName };
};

export const getSavedThermalTargets = async () => {
  const entries = await Promise.all(
    (Object.keys(PRINTER_STORAGE_KEYS) as ThermalPrinterRole[]).map((role) =>
      getSavedThermalTarget(role)
    )
  );

  return entries.reduce<Record<ThermalPrinterRole, SavedThermalTarget | null>>(
    (acc, entry, index) => {
      const role = (Object.keys(PRINTER_STORAGE_KEYS) as ThermalPrinterRole[])[index];
      acc[role] = entry;
      return acc;
    },
    {
      main: null,
      'dine-in': null,
      takeaway: null,
    }
  );
};

export const clearSavedThermalTarget = async (role: ThermalPrinterRole) => {
  const storage = PRINTER_STORAGE_KEYS[role];
  await Promise.all([
    AsyncStorage.removeItem(storage.target),
    AsyncStorage.removeItem(storage.name),
  ]);
};

export const getSavedThermalSetupMode = async (): Promise<ThermalPrinterSetupMode> => {
  const raw = await AsyncStorage.getItem(PRINTER_SETUP_MODE_KEY);
  if (raw === '1' || raw === '2' || raw === '3') {
    return Number(raw) as ThermalPrinterSetupMode;
  }

  return 3;
};

export const saveThermalSetupMode = async (setupMode: ThermalPrinterSetupMode) => {
  await AsyncStorage.setItem(PRINTER_SETUP_MODE_KEY, String(setupMode));
};

const resolvePrinterForRole = async (role: ThermalPrinterRole) => {
  const setupMode = await getSavedThermalSetupMode();
  const normalizedRole =
    setupMode === 1 ? 'main' : setupMode === 2 && role !== 'main' ? 'dine-in' : role;
  const exactPrinter = await getSavedThermalTarget(normalizedRole);
  if (exactPrinter) {
    return {
      ...exactPrinter,
      role,
    };
  }

  if (role !== 'main') {
    return getSavedThermalTarget('main');
  }

  return null;
};

export const printThermalText = async (lines: string[], role: ThermalPrinterRole = 'main') => {
  if (!isThermalFeatureEnabled()) {
    throw new Error(getThermalFeatureMessage());
  }

  const escpos = loadEscPosModule();
  const saved = await resolvePrinterForRole(role);
  if (!saved) {
    throw new Error(`Belum ada thermal printer yang tersambung untuk ${getThermalPrinterRoleLabel(role)}.`);
  }

  const printer = new escpos.Printer({
    target: saved.target,
    deviceName: saved.deviceName,
  });

  await printer.init();
  await printer.connect();
  for (const line of lines) {
    // eslint-disable-next-line no-await-in-loop
    await printer.addText(`${line}\n`);
  }
  await printer.addFeedLine(2);
  await printer.sendData();
  await printer.disconnect();
};

export const printThermalTestReceipt = async () => {
  await printThermalText([
    'RestoPOS',
    'Thermal Printer Test',
    `${new Date().toLocaleString('id-ID')}`,
    '------------------------------',
    'Jika ini tercetak, koneksi OK.',
  ], 'main');
};
