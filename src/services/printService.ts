import * as Print from 'expo-print';
import { CartItem, Order } from '../types';
import { formatPrice } from '../data/mockData';
import {
  isThermalFeatureEnabled,
  printThermalText,
  ThermalPrinterRole,
} from './thermalPrinterService';

const STORE_NAME = 'RestoPOS';

interface CashierPrintMeta {
  cashierName: string;
  restaurantName?: string;
}

interface KitchenPrintMeta {
  cashierName?: string;
  restaurantName?: string;
}

const getKitchenPrinterRole = (order: Order): ThermalPrinterRole =>
  order.orderType === 'dine-in' ? 'dine-in' : 'takeaway';

const getOrderTypeLabel = (order: Order) => {
  if (order.orderType === 'dine-in') return 'Dine In';
  if (order.orderType === 'delivery') return 'Delivery';
  return 'Take Away';
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getProductCount = (order: Order) => order.items.reduce((sum, item) => sum + item.quantity, 0);

const formatItemDetails = (item: CartItem) => {
  const optionText = item.options && item.options.length > 0 ? `<div>${item.options.join(' • ')}</div>` : '';
  const noteText = item.note ? `<div>Note: ${item.note}</div>` : '';
  return `${optionText}${noteText}`;
};

const asReceiptHtml = (order: Order) => `
  <html>
    <body style="font-family: Arial, sans-serif; padding: 16px; color: #111827;">
      <div style="text-align:center; margin-bottom: 14px;">
        <h1 style="margin:0; font-size: 22px;">${STORE_NAME}</h1>
        <p style="margin:6px 0 0 0; font-size: 13px;">${getOrderTypeLabel(order)}</p>
        <p style="margin:4px 0 0 0; font-size: 12px;">Invoice ${order.orderNumber}</p>
      </div>

      <table style="width:100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #D1D5DB; padding-bottom:6px;">Item</th>
            <th style="text-align:center; border-bottom:1px solid #D1D5DB; padding-bottom:6px;">Qty</th>
            <th style="text-align:right; border-bottom:1px solid #D1D5DB; padding-bottom:6px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (item) => `
                <tr>
                  <td style="padding:8px 0; vertical-align:top;">
                    <div style="font-weight:700;">${item.product.name}</div>
                    <div style="font-size:11px; color:#6B7280;">${formatItemDetails(item)}</div>
                  </td>
                  <td style="padding:8px 0; text-align:center; vertical-align:top;">${item.quantity}</td>
                  <td style="padding:8px 0; text-align:right; vertical-align:top;">${formatPrice(
                    item.product.price * item.quantity
                  )}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>

      <div style="margin-top:16px; border-top:1px solid #D1D5DB; padding-top:10px;">
        <p style="display:flex; justify-content:space-between; margin:4px 0;">
          <span>Subtotal</span><span>${formatPrice(order.subtotal)}</span>
        </p>
        <p style="display:flex; justify-content:space-between; margin:4px 0;">
          <span>Discount</span><span>${formatPrice(order.discount)}</span>
        </p>
        <p style="display:flex; justify-content:space-between; margin:4px 0;">
          <span>Tax</span><span>${formatPrice(order.tax)}</span>
        </p>
        <p style="display:flex; justify-content:space-between; font-weight:700; font-size:15px; margin:8px 0 0 0;">
          <span>Total</span><span>${formatPrice(order.total)}</span>
        </p>
      </div>

      <p style="text-align:center; margin-top:18px; font-size:12px;">Terima kasih, semoga harimu menyenangkan.</p>
    </body>
  </html>
`;

const formatReceiptItemDetails = (item: CartItem) => {
  const lines = [];
  if (item.options && item.options.length > 0) {
    lines.push(`<div class="item-meta">${escapeHtml(item.options.join(' | '))}</div>`);
  }
  if (item.note) {
    lines.push(`<div class="item-meta">Note: ${escapeHtml(item.note)}</div>`);
  }
  return lines.join('');
};

const asCashierReceiptHtml = (order: Order, meta: CashierPrintMeta) => `
  <html>
    <body style="margin:0; background:#ffffff; color:#111827;">
      <div style="max-width:300px; margin:0 auto; padding:16px 14px; font-family:'Courier New', monospace; font-size:12px; line-height:1.35;">
        <div style="text-align:center; margin-bottom:10px;">
          <div style="width:78px; height:78px; border:2px solid #111827; border-radius:39px; margin:0 auto 8px auto; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:700;">
            ${escapeHtml((meta.restaurantName ?? STORE_NAME).slice(0, 2).toUpperCase())}
          </div>
          <div style="font-size:17px; font-weight:700; text-transform:uppercase;">${escapeHtml(
            meta.restaurantName ?? STORE_NAME
          )}</div>
          <div style="margin-top:2px; font-size:11px;">${escapeHtml(getOrderTypeLabel(order))}</div>
          ${
            order.customer.phone
              ? `<div style="margin-top:2px; font-size:11px;">${escapeHtml(order.customer.phone)}</div>`
              : ''
          }
          <div style="margin-top:8px; font-size:11px;">Simplified Tax Invoice / Reprint</div>
        </div>

        <div style="border:1px solid #111827; text-align:center; padding:8px 6px; margin-bottom:10px;">
          <div style="font-size:11px;">No Invoice</div>
          <div style="font-size:23px; font-weight:700; margin-top:2px;">${escapeHtml(
            order.orderNumber
          )}</div>
        </div>

        <div style="margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between;"><span>Printed At</span><span>${escapeHtml(
            formatDateTime(order.createdAt)
          )}</span></div>
          <div style="display:flex; justify-content:space-between;"><span>Cashier</span><span>${escapeHtml(
            meta.cashierName
          )}</span></div>
          <div style="display:flex; justify-content:space-between;"><span>Customer</span><span>${escapeHtml(
            order.customer.name || '-'
          )}</span></div>
          <div style="display:flex; justify-content:space-between;"><span>Receipt No</span><span>${escapeHtml(
            order.customer.receiptNo || '-'
          )}</span></div>
        </div>

        ${
          order.orderNote
            ? `<div style="margin-bottom:10px; border:1px solid #D1D5DB; padding:8px;">
                <div style="font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase;">Order Note</div>
                <div style="margin-top:4px; font-size:12px; font-weight:700;">${escapeHtml(order.orderNote)}</div>
              </div>`
            : ''
        }

        <div style="border-top:1px dashed #111827; border-bottom:1px dashed #111827; padding:8px 0;">
          <div style="display:flex; font-weight:700; margin-bottom:6px;">
            <div style="flex:1;">Any Item</div>
            <div style="width:38px; text-align:center;">Qty</div>
            <div style="width:78px; text-align:right;">Amount</div>
          </div>
          ${order.items
            .map(
              (item) => `
                <div style="display:flex; margin-bottom:6px; align-items:flex-start;">
                  <div style="flex:1; padding-right:8px;">
                    <div style="font-weight:700;">${escapeHtml(item.product.name)}</div>
                    ${formatReceiptItemDetails(item)}
                  </div>
                  <div style="width:38px; text-align:center;">${item.quantity}</div>
                  <div style="width:78px; text-align:right;">${escapeHtml(
                    formatPrice(item.product.price * item.quantity)
                  )}</div>
                </div>
              `
            )
            .join('')}
        </div>

        <div style="padding-top:10px;">
          <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Subtotal</span><span>${escapeHtml(
            formatPrice(order.subtotal)
          )}</span></div>
          <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Discount</span><span>${escapeHtml(
            formatPrice(order.discount)
          )}</span></div>
          <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Tax</span><span>${escapeHtml(
            formatPrice(order.tax)
          )}</span></div>
          <div style="display:flex; justify-content:space-between; margin:8px 0 0 0; font-size:15px; font-weight:700; border-top:1px dashed #111827; padding-top:8px;">
            <span>Total</span><span>${escapeHtml(formatPrice(order.total))}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin:4px 0 0 0;">
            <span>Products Count</span><span>${getProductCount(order)}</span>
          </div>
        </div>

        <div style="margin-top:14px; text-align:center; font-size:11px;">
          <div>Thank You</div>
          <div style="margin-top:4px;">Terima kasih sudah berbelanja</div>
        </div>
      </div>
    </body>
  </html>
`;

const asKitchenHtml = (order: Order) => `
  <html>
    <body style="font-family: Arial, sans-serif; padding: 14px; color: #111827;">
      <h2 style="text-align:center; margin:0;">KITCHEN TICKET</h2>
      <p style="text-align:center; margin:6px 0 12px 0;">${getOrderTypeLabel(order)}</p>
      ${order.items
        .map(
          (item) => `
            <div style="margin-bottom:12px; border-bottom:1px dashed #D1D5DB; padding-bottom:8px;">
              <div style="font-size:18px; font-weight:700;">${item.quantity}x ${item.product.name}</div>
              ${
                item.options && item.options.length > 0
                  ? `<div style="font-size:13px; margin-top:4px;">${item.options.join(' • ')}</div>`
                  : ''
              }
              ${item.note ? `<div style="font-size:13px; margin-top:2px;">Note: ${item.note}</div>` : ''}
            </div>
          `
        )
        .join('')}
    </body>
  </html>
`;

const asKitchenTicketHtml = (order: Order, meta?: KitchenPrintMeta) => `
  <html>
    <body style="margin:0; background:#ffffff; color:#111827;">
      <div style="max-width:300px; margin:0 auto; padding:12px 12px 18px 12px; font-family:'Courier New', monospace; font-size:12px; line-height:1.35;">
        <div style="text-align:center; font-size:16px; font-weight:700; margin-bottom:4px;">${escapeHtml(
          meta?.restaurantName ?? STORE_NAME
        )}</div>
        <div style="text-align:center; font-size:22px; font-weight:700; margin-bottom:8px;">Order# ${escapeHtml(
          order.orderNumber.replace('INV-', '')
        )}</div>

        <div style="margin-bottom:10px; border-top:1px solid #111827; border-bottom:1px solid #111827; padding:8px 0;">
          <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Printed At:</span><span>${escapeHtml(
            formatDateTime(order.createdAt)
          )}</span></div>
          <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Type:</span><span>${escapeHtml(
            getOrderTypeLabel(order)
          )}</span></div>
          <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Guests:</span><span>${order.splitBillCount || 1}</span></div>
          <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Device:</span><span>${escapeHtml(
            `${meta?.cashierName ?? 'Cashier'}${meta?.restaurantName ? ` - ${meta.restaurantName}` : ''}`
          )}</span></div>
          <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Date:</span><span>${escapeHtml(
            new Date(order.createdAt).toLocaleDateString('id-ID')
          )}</span></div>
          <div style="display:flex; justify-content:space-between; margin:2px 0;"><span>Time:</span><span>${escapeHtml(
            new Date(order.createdAt).toLocaleTimeString('id-ID')
          )}</span></div>
        </div>

        <div style="text-align:center; font-size:20px; font-weight:700; margin-bottom:8px;">NEW</div>

        ${
          order.orderNote
            ? `<div style="margin-bottom:10px; border:1px solid #D1D5DB; padding:8px;">
                <div style="font-size:11px; font-weight:700; color:#6B7280; text-transform:uppercase;">Order Note</div>
                <div style="margin-top:4px; font-size:13px; font-weight:700;">${escapeHtml(order.orderNote)}</div>
              </div>`
            : ''
        }

        ${order.items
          .map(
            (item) => `
              <div style="margin-bottom:12px; border-bottom:1px dashed #D1D5DB; padding-bottom:8px;">
                <div style="font-size:18px; font-weight:700;">${item.quantity}x ${escapeHtml(
                  item.product.name
                )}</div>
                ${
                  item.options && item.options.length > 0
                    ? item.options
                        .map(
                          (option) =>
                            `<div style="font-size:14px; margin-top:4px; padding-left:8px;">${escapeHtml(option)}</div>`
                        )
                        .join('')
                    : ''
                }
                ${
                  item.note
                    ? `<div style="font-size:14px; margin-top:4px; padding-left:8px;">Note: ${escapeHtml(
                        item.note
                      )}</div>`
                    : ''
                }
              </div>
            `
          )
          .join('')}
      </div>
    </body>
  </html>
`;

const tryEscPosThermalPrint = async (
  lines: string[],
  role: ThermalPrinterRole
): Promise<boolean> => {
  if (!isThermalFeatureEnabled()) {
    return false;
  }

  try {
    await printThermalText(lines, role);
    return true;
  } catch {
    return false;
  }
};

export const printCashierReceipt = async (
  order: Order,
  cashierName: string,
  restaurantName?: string,
  preferThermal = false
) => {
  if (preferThermal) {
    const thermalLines = [
      restaurantName ?? STORE_NAME,
      getOrderTypeLabel(order),
      `No Invoice ${order.orderNumber}`,
      `Printed ${formatDateTime(order.createdAt)}`,
      `Cashier ${cashierName}`,
      `Customer ${order.customer.name || '-'}`,
      `Receipt ${order.customer.receiptNo || '-'}`,
      ...(order.orderNote ? [`Note ${order.orderNote}`, '------------------------------'] : []),
      '------------------------------',
      ...order.items.flatMap((item) => {
        const detailLines = [`${item.quantity}x ${item.product.name}`];
        if (item.options && item.options.length > 0) {
          detailLines.push(item.options.join(' | '));
        }
        if (item.note) {
          detailLines.push(`Note: ${item.note}`);
        }
        return detailLines;
      }),
      '------------------------------',
      `Subtotal ${formatPrice(order.subtotal)}`,
      `Discount ${formatPrice(order.discount)}`,
      `Tax ${formatPrice(order.tax)}`,
      `Total ${formatPrice(order.total)}`,
      `Products ${getProductCount(order)}`,
      'Terima kasih',
    ];
    const thermalPrinted = await tryEscPosThermalPrint(thermalLines, 'main');
    if (thermalPrinted) return;
  }

  await Print.printAsync({
    html: asCashierReceiptHtml(order, {
      cashierName,
      restaurantName,
    }),
  });
};

export const printKitchenTicket = async (
  order: Order,
  preferThermal = false,
  meta?: KitchenPrintMeta
) => {
  if (preferThermal) {
    const thermalLines = [
      meta?.restaurantName ?? STORE_NAME,
      `Order# ${order.orderNumber.replace('INV-', '')}`,
      `Printed ${formatDateTime(order.createdAt)}`,
      `Type ${getOrderTypeLabel(order)}`,
      `Guests ${order.splitBillCount || 1}`,
      `Device ${meta?.cashierName ?? 'Cashier'}`,
      'NEW',
      ...(order.orderNote ? [`Note ${order.orderNote}`, '------------------------------'] : []),
      '------------------------------',
      ...order.items.flatMap((item) => {
        const detailLines = [`${item.quantity}x ${item.product.name}`];
        if (item.options && item.options.length > 0) {
          detailLines.push(...item.options);
        }
        if (item.note) {
          detailLines.push(`Note: ${item.note}`);
        }
        return detailLines;
      }),
    ];
    const thermalPrinted = await tryEscPosThermalPrint(
      thermalLines,
      getKitchenPrinterRole(order)
    );
    if (thermalPrinted) return;
  }

  await Print.printAsync({ html: asKitchenTicketHtml(order, meta) });
};
