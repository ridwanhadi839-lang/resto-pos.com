import { CancelLog, Category, Order, Product } from '../types';

type ReportRow = {
  label: string;
  qty: number;
  amount: number;
};

type TotalPaymentsRow = {
  qty: number;
  amount: number;
};

export type TillSummaryReport = {
  printedAt: string;
  rows: ReportRow[];
  orderTypes: ReportRow[];
  payments: ReportRow[];
  cancelReasons: ReportRow[];
  totalPayments: TotalPaymentsRow;
};

export type ProductMixSection = {
  id: string;
  name: string;
  items: Array<{
    id: string;
    name: string;
    qty: number;
    amount: number;
  }>;
};

export const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getReportOrdersByDate = (orders: Order[], reportDate: string) =>
  orders.filter(
    (order) =>
      (order.status === 'paid' || order.status === 'sent_to_kitchen') &&
      toDateKey(new Date(order.createdAt)) === reportDate
  );

export const getCancelLogsByDate = (cancelLogs: CancelLog[], reportDate: string) =>
  cancelLogs.filter((log) => toDateKey(new Date(log.createdAt)) === reportDate);

export const buildTillSummaryReport = ({
  orders,
  cancelLogs,
  printedAt = new Date().toLocaleString('id-ID'),
}: {
  orders: Order[];
  cancelLogs: CancelLog[];
  printedAt?: string;
}): TillSummaryReport => {
  const orderTypeSummary: Record<string, { label: string; total: number; count: number }> = {
    'dine-in': { label: 'Dine In', total: 0, count: 0 },
    takeaway: { label: 'Take Away', total: 0, count: 0 },
    delivery: { label: 'Delivery', total: 0, count: 0 },
    'drive-thru': { label: 'Drive Thru', total: 0, count: 0 },
  };

  orders.forEach((order) => {
    const key = order.orderType === 'delivery' ? 'delivery' : order.orderType;
    const target = orderTypeSummary[key];

    if (!target) return;

    target.total += order.total;
    target.count += 1;
  });

  const grossSales = orders.reduce((sum, order) => sum + order.subtotal, 0);
  const discountTotal = orders.reduce((sum, order) => sum + order.discount, 0);
  const taxTotal = orders.reduce((sum, order) => sum + order.tax, 0);
  const netSales = orders.reduce((sum, order) => sum + order.total, 0);
  const orderCount = orders.length;
  const averagePerOrder = orderCount > 0 ? netSales / orderCount : 0;
  const cancelCount = cancelLogs.length;
  const cancelTotal = cancelLogs.reduce((sum, log) => sum + log.total, 0);

  const paymentRows = orders.reduce<Record<string, { qty: number; amount: number }>>(
    (acc, order) => {
      order.payments.forEach((payment) => {
        const key = payment.method.toUpperCase();
        const current = acc[key] ?? { qty: 0, amount: 0 };
        acc[key] = {
          qty: current.qty + 1,
          amount: current.amount + payment.amount,
        };
      });
      return acc;
    },
    {}
  );

  const cancelReasonRows = cancelLogs.reduce<Record<string, { qty: number; amount: number }>>(
    (acc, log) => {
      const current = acc[log.reason] ?? { qty: 0, amount: 0 };
      acc[log.reason] = {
        qty: current.qty + 1,
        amount: current.amount + log.total,
      };
      return acc;
    },
    {}
  );

  return {
    printedAt,
    rows: [
      { label: 'Gross Sales', qty: orderCount, amount: grossSales },
      { label: 'Discount', qty: orderCount, amount: discountTotal },
      { label: 'Tax Charge', qty: orderCount, amount: taxTotal },
      { label: 'Net Sales', qty: orderCount, amount: netSales },
      { label: 'Cancel Total', qty: cancelCount, amount: cancelTotal },
      { label: 'Guest Count', qty: orderCount, amount: 0 },
      { label: 'Average Per Order', qty: 0, amount: averagePerOrder },
    ],
    orderTypes: Object.values(orderTypeSummary).map((item) => ({
      label: item.label,
      qty: item.count,
      amount: item.total,
    })),
    payments: Object.entries(paymentRows).map(([label, item]) => ({
      label,
      qty: item.qty,
      amount: item.amount,
    })),
    cancelReasons: Object.entries(cancelReasonRows).map(([label, item]) => ({
      label,
      qty: item.qty,
      amount: item.amount,
    })),
    totalPayments: Object.values(paymentRows).reduce(
      (sum, item) => ({
        qty: sum.qty + item.qty,
        amount: sum.amount + item.amount,
      }),
      { qty: 0, amount: 0 }
    ),
  };
};

export const buildProductMixReport = ({
  categories,
  products,
  orders,
}: {
  categories: Category[];
  products: Product[];
  orders: Order[];
}): ProductMixSection[] =>
  categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      items: products
        .filter((product) => product.categoryId === category.id)
        .map((product) => {
          const totals = orders.reduce(
            (sum, order) => {
              const matchingItems = order.items.filter((item) => item.product.id === product.id);
              const qty = matchingItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
              const amount = matchingItems.reduce(
                (itemSum, item) => itemSum + item.product.price * item.quantity,
                0
              );

              return {
                qty: sum.qty + qty,
                amount: sum.amount + amount,
              };
            },
            { qty: 0, amount: 0 }
          );

          return {
            id: product.id,
            name: product.name,
            qty: totals.qty,
            amount: totals.amount,
          };
        }),
    }))
    .filter((section) => section.items.length > 0);
