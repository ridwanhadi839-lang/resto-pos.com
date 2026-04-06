import { CancelReason, Order } from '../../types';

export type MoreSection =
  | 'till-summary'
  | 'product-mix'
  | 'bluetooth-printer';
export type PrintableReportSection = Extract<MoreSection, 'till-summary' | 'product-mix'>;

export const DISCOUNT_STEPS = [0, 10, 15, 20];
export const MORE_MENU_ITEMS: Array<{ id: MoreSection; label: string }> = [
  { id: 'till-summary', label: 'Till Summary' },
  { id: 'product-mix', label: 'Product Mix' },
  { id: 'bluetooth-printer', label: 'Bluetooth Printer' },
];
export const VOID_REASONS: CancelReason[] = ['Customer Cancel', 'Wrong Order'];
export const CALENDAR_WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const getOrderModeLabel = (orderType: Order['orderType']) => {
  if (orderType === 'delivery') return 'Delivery';
  if (orderType === 'takeaway') return 'Take Away';
  return 'Dine In';
};

export const getMoreSectionLabel = (section: MoreSection) =>
  MORE_MENU_ITEMS.find((item) => item.id === section)?.label ?? 'More';

export const needsReportDate = (section: MoreSection | null) =>
  section === 'till-summary' || section === 'product-mix';

export const formatDateLabel = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export const formatReportAmount = (value: number) =>
  value.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
