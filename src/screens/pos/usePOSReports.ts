import { useMemo, useState } from 'react';

import { CancelLog, Category, OpenTillEntry, Order, Product } from '../../types';
import {
  buildProductMixReport,
  buildTillSummaryReport,
  getCancelLogsByDate,
  getOpenTillEntriesByDate,
  getReportOrdersByDate,
  toDateKey,
} from '../../utils/reporting';
import { formatDateLabel, formatReportAmount } from './posScreen.constants';

const formatMonthYearLabel = (year: number, month: number) =>
  new Date(year, month, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

const escapePrintHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildPrintTableRows = (
  rows: Array<{ label: string; qty: number | string; amount: number | string }>
) =>
  rows
    .map(
      (row) => `
        <tr>
          <td>${escapePrintHtml(String(row.label))}</td>
          <td>${escapePrintHtml(String(row.qty))}</td>
          <td>${escapePrintHtml(String(row.amount))}</td>
        </tr>
      `
    )
    .join('');

const buildPrintSection = (
  title: string,
  rows: Array<{ label: string; qty: number | string; amount: number | string }>,
  emptyText?: string
) => `
  <section class="section">
    <div class="section-title">${escapePrintHtml(title)}</div>
    ${
      rows.length === 0
        ? `<div class="empty">${escapePrintHtml(emptyText ?? 'Belum ada data.')}</div>`
        : `
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${buildPrintTableRows(rows)}
            </tbody>
          </table>
        `
    }
  </section>
`;

const buildReportPrintShell = ({
  restaurantName,
  title,
  businessDate,
  printedAt,
  body,
}: {
  restaurantName: string;
  title: string;
  businessDate: string;
  printedAt: string;
  body: string;
}) => `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <title>${escapePrintHtml(title)}</title>
    <style>
      body {
        margin: 0;
        padding: 24px;
        font-family: Arial, sans-serif;
        color: #111827;
        background: #ffffff;
      }

      .sheet {
        max-width: 720px;
        margin: 0 auto;
      }

      .header {
        margin-bottom: 18px;
      }

      .restaurant {
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 6px;
      }

      .title {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 6px;
      }

      .meta {
        font-size: 12px;
        color: #4b5563;
        line-height: 1.6;
      }

      .section {
        margin-top: 18px;
      }

      .section-title {
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 8px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        border-bottom: 1px solid #e5e7eb;
        padding: 8px 0;
        font-size: 12px;
        text-align: left;
      }

      th:nth-child(2),
      th:nth-child(3),
      td:nth-child(2),
      td:nth-child(3) {
        text-align: right;
      }

      th {
        font-size: 11px;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .total-row td {
        font-weight: 700;
        border-top: 1px solid #d1d5db;
      }

      .empty {
        font-size: 12px;
        color: #6b7280;
        padding: 8px 0;
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="header">
        <div class="restaurant">${escapePrintHtml(restaurantName)}</div>
        <div class="title">${escapePrintHtml(title)}</div>
        <div class="meta">Business Date: ${escapePrintHtml(businessDate)}</div>
        <div class="meta">Printed: ${escapePrintHtml(printedAt)}</div>
      </div>
      ${body}
    </div>
  </body>
</html>`;

const buildCalendarMonth = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlankDays = firstDay.getDay();

  return {
    key: `${year}-${month}`,
    label: formatMonthYearLabel(year, month),
    days: [
      ...Array.from({ length: leadingBlankDays }, () => null),
      ...Array.from({ length: daysInMonth }, (_, dayIndex) => {
        const date = new Date(year, month, dayIndex + 1);
        return {
          key: toDateKey(date),
          label: String(dayIndex + 1),
        };
      }),
    ],
  };
};

export const usePOSReports = ({
  orders,
  cancelLogs,
  openTillEntries,
  categories,
  products,
  restaurantName,
}: {
  orders: Order[];
  cancelLogs: CancelLog[];
  openTillEntries: OpenTillEntry[];
  categories: Category[];
  products: Product[];
  restaurantName?: string;
}) => {
  const [selectedReportDate, setSelectedReportDate] = useState<string | null>(null);
  const [reportMonthCursor, setReportMonthCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const paidOrders = useMemo(
    () => orders.filter((order) => order.status === 'paid' || order.status === 'sent_to_kitchen'),
    [orders]
  );

  const reportCalendarMonth = useMemo(
    () => buildCalendarMonth(reportMonthCursor.year, reportMonthCursor.month),
    [reportMonthCursor]
  );

  const selectedReportOrders = useMemo(() => {
    if (!selectedReportDate) return [];
    return getReportOrdersByDate(paidOrders, selectedReportDate);
  }, [paidOrders, selectedReportDate]);

  const selectedCancelLogs = useMemo(() => {
    if (!selectedReportDate) return [];
    return getCancelLogsByDate(cancelLogs, selectedReportDate);
  }, [cancelLogs, selectedReportDate]);

  const selectedOpenTillEntries = useMemo(() => {
    if (!selectedReportDate) return [];
    return getOpenTillEntriesByDate(openTillEntries, selectedReportDate);
  }, [openTillEntries, selectedReportDate]);

  const tillSummaryReport = useMemo(
    () =>
      buildTillSummaryReport({
        orders: selectedReportOrders,
        cancelLogs: selectedCancelLogs,
        openTillEntries: selectedOpenTillEntries,
      }),
    [selectedCancelLogs, selectedOpenTillEntries, selectedReportOrders]
  );

  const productMix = useMemo(
    () =>
      buildProductMixReport({
        categories,
        products,
        orders: selectedReportOrders,
      }),
    [categories, products, selectedReportOrders]
  );

  const resetReportCalendar = () => {
    const now = new Date();
    setReportMonthCursor({ year: now.getFullYear(), month: now.getMonth() });
  };

  const changeReportMonth = (offset: number) => {
    setReportMonthCursor((current) => {
      const nextDate = new Date(current.year, current.month + offset, 1);
      return { year: nextDate.getFullYear(), month: nextDate.getMonth() };
    });
  };

  const buildTillSummaryPrintHtml = () => {
    const businessDate = selectedReportDate ? formatDateLabel(selectedReportDate) : '-';

    return buildReportPrintShell({
      restaurantName: restaurantName ?? 'RestoPOS',
      title: 'Till Summary',
      businessDate,
      printedAt: tillSummaryReport.printedAt,
      body: `
        ${buildPrintSection(
          'General',
          tillSummaryReport.rows.map((row) => ({
            label: row.label,
            qty: row.qty > 0 ? row.qty : '-',
            amount: formatReportAmount(row.amount),
          }))
        )}
        ${buildPrintSection(
          'Order Types',
          tillSummaryReport.orderTypes.map((row) => ({
            label: row.label,
            qty: row.qty,
            amount: formatReportAmount(row.amount),
          }))
        )}
        ${buildPrintSection(
          'Payments',
          tillSummaryReport.payments.map((row) => ({
            label: row.label,
            qty: row.qty,
            amount: formatReportAmount(row.amount),
          })),
          'Belum ada payment pada tanggal ini.'
        )}
        ${buildPrintSection(
          'Cancel Reasons',
          tillSummaryReport.cancelReasons.map((row) => ({
            label: row.label,
            qty: row.qty,
            amount: formatReportAmount(row.amount),
          })),
          'Belum ada data cancel pada tanggal ini.'
        )}
        <section class="section">
          <table>
            <tbody>
              <tr class="total-row">
                <td>Total Payments</td>
                <td>${tillSummaryReport.totalPayments.qty}</td>
                <td>${formatReportAmount(tillSummaryReport.totalPayments.amount)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      `,
    });
  };

  const buildProductMixPrintHtml = () => {
    const businessDate = selectedReportDate ? formatDateLabel(selectedReportDate) : '-';
    const totalItems = productMix.reduce(
      (sum, section) => sum + section.items.reduce((itemSum, item) => itemSum + item.qty, 0),
      0
    );
    const totalAmount = productMix.reduce(
      (sum, section) => sum + section.items.reduce((itemSum, item) => itemSum + item.amount, 0),
      0
    );

    return buildReportPrintShell({
      restaurantName: restaurantName ?? 'RestoPOS',
      title: 'Product Mix',
      businessDate,
      printedAt: new Date().toLocaleString('id-ID'),
      body: `
        ${
          productMix.length === 0
            ? '<section class="section"><div class="empty">Belum ada data product mix.</div></section>'
            : productMix
                .map((section) =>
                  buildPrintSection(
                    section.name,
                    section.items.map((item) => ({
                      label: item.name,
                      qty: item.qty,
                      amount: formatReportAmount(item.amount),
                    }))
                  )
                )
                .join('')
        }
        <section class="section">
          <table>
            <tbody>
              <tr class="total-row">
                <td>Total</td>
                <td>${totalItems}</td>
                <td>${formatReportAmount(totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      `,
    });
  };

  return {
    selectedReportDate,
    setSelectedReportDate,
    reportCalendarMonth,
    tillSummaryReport,
    productMix,
    resetReportCalendar,
    changeReportMonth,
    buildTillSummaryPrintHtml,
    buildProductMixPrintHtml,
  };
};
