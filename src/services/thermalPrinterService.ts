import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PRINTER_TARGET_KEY = 'restopos:thermal:target';
const PRINTER_NAME_KEY = 'restopos:thermal:name';

export type PrinterTransport = 'bluetooth' | 'lan';

export interface ThermalDevice {
  target: string;
  deviceName: string;
  ipAddress?: string;
  macAddress?: string;
}

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

export const saveThermalTarget = async (target: string, deviceName: string) => {
  await Promise.all([
    AsyncStorage.setItem(PRINTER_TARGET_KEY, target),
    AsyncStorage.setItem(PRINTER_NAME_KEY, deviceName),
  ]);
};

export const getSavedThermalTarget = async () => {
  const [target, deviceNameRaw] = await Promise.all([
    AsyncStorage.getItem(PRINTER_TARGET_KEY),
    AsyncStorage.getItem(PRINTER_NAME_KEY),
  ]);
  const deviceName = deviceNameRaw ?? 'RestoPOS Thermal';
  if (!target) return null;
  return { target, deviceName };
};

export const clearSavedThermalTarget = async () => {
  await Promise.all([
    AsyncStorage.removeItem(PRINTER_TARGET_KEY),
    AsyncStorage.removeItem(PRINTER_NAME_KEY),
  ]);
};

export const printThermalText = async (lines: string[]) => {
  if (!isThermalFeatureEnabled()) {
    throw new Error(getThermalFeatureMessage());
  }

  const escpos = loadEscPosModule();
  const saved = await getSavedThermalTarget();
  if (!saved) {
    throw new Error('Belum ada thermal printer yang tersambung.');
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
  ]);
};
