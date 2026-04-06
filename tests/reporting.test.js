const assert = require('node:assert/strict');

const {
  buildProductMixReport,
  buildTillSummaryReport,
  getCancelLogsByDate,
  getReportOrdersByDate,
} = require('../.test-dist/utils/reporting');

const categories = [
  { id: 'cat-burger', name: 'Burger' },
  { id: 'cat-app', name: 'Appetizer' },
];

const products = [
  { id: 'prod-beef', name: 'Beef Burger', price: 35, categoryId: 'cat-burger' },
  { id: 'prod-chicken', name: 'Chicken Burger', price: 32, categoryId: 'cat-burger' },
  { id: 'prod-fries', name: 'French Fries', price: 18, categoryId: 'cat-app' },
];

const orders = [
  {
    id: 'ord-1',
    orderNumber: 'INV-1',
    items: [
      {
        id: 'item-1',
        product: products[0],
        quantity: 2,
      },
      {
        id: 'item-2',
        product: products[2],
        quantity: 1,
      },
    ],
    subtotal: 88,
    discount: 8,
    tax: 8,
    total: 88,
    splitBillCount: 1,
    payments: [{ id: 'pay-1', method: 'cash', amount: 88 }],
    status: 'paid',
    orderType: 'takeaway',
    customer: { name: 'Alya', phone: '0501', receiptNo: 'R1' },
    createdAt: '2026-04-06T09:00:00.000Z',
    synced: true,
  },
  {
    id: 'ord-2',
    orderNumber: 'INV-2',
    items: [
      {
        id: 'item-3',
        product: products[1],
        quantity: 1,
      },
    ],
    subtotal: 32,
    discount: 0,
    tax: 3.2,
    total: 35.2,
    splitBillCount: 1,
    payments: [{ id: 'pay-2', method: 'visa', amount: 35.2 }],
    status: 'sent_to_kitchen',
    orderType: 'dine-in',
    customer: { name: 'Bima', phone: '0502', receiptNo: 'R2' },
    tableNumber: '4',
    createdAt: '2026-04-06T11:00:00.000Z',
    synced: true,
  },
  {
    id: 'ord-3',
    orderNumber: 'INV-3',
    items: [
      {
        id: 'item-4',
        product: products[2],
        quantity: 3,
      },
    ],
    subtotal: 54,
    discount: 0,
    tax: 5.4,
    total: 59.4,
    splitBillCount: 1,
    payments: [{ id: 'pay-3', method: 'cash', amount: 59.4 }],
    status: 'pending',
    orderType: 'takeaway',
    customer: { name: 'Cici', phone: '0503', receiptNo: 'R3' },
    createdAt: '2026-04-06T12:00:00.000Z',
    synced: true,
  },
];

const cancelLogs = [
  {
    id: 'cancel-1',
    orderNumber: 'INV-4',
    reason: 'Customer Cancel',
    subtotal: 40,
    discount: 0,
    tax: 4,
    total: 44,
    itemCount: 1,
    createdAt: '2026-04-06T08:00:00.000Z',
  },
  {
    id: 'cancel-2',
    orderNumber: 'INV-5',
    reason: 'Wrong Order',
    subtotal: 20,
    discount: 0,
    tax: 2,
    total: 22,
    itemCount: 1,
    createdAt: '2026-04-05T08:00:00.000Z',
  },
];

const run = () => {
  const reportOrders = getReportOrdersByDate(orders, '2026-04-06');
  const reportCancels = getCancelLogsByDate(cancelLogs, '2026-04-06');
  const report = buildTillSummaryReport({
    orders: reportOrders,
    cancelLogs: reportCancels,
    printedAt: '06/04/2026 12:00',
  });

  assert.equal(report.rows.find((row) => row.label === 'Gross Sales')?.amount, 120);
  assert.equal(report.rows.find((row) => row.label === 'Net Sales')?.amount, 123.2);
  assert.equal(report.rows.find((row) => row.label === 'Cancel Total')?.amount, 44);
  assert.equal(report.orderTypes.find((row) => row.label === 'Dine In')?.qty, 1);
  assert.equal(report.orderTypes.find((row) => row.label === 'Take Away')?.qty, 1);
  assert.equal(report.payments.find((row) => row.label === 'CASH')?.amount, 88);
  assert.equal(report.payments.find((row) => row.label === 'VISA')?.amount, 35.2);
  assert.equal(report.cancelReasons.find((row) => row.label === 'Customer Cancel')?.amount, 44);
  assert.deepEqual(report.totalPayments, { qty: 2, amount: 123.2 });

  const productMixOrders = getReportOrdersByDate(orders, '2026-04-06');
  const productMix = buildProductMixReport({
    categories,
    products,
    orders: productMixOrders,
  });

  const burgerSection = productMix.find((section) => section.name === 'Burger');
  const appetizerSection = productMix.find((section) => section.name === 'Appetizer');

  assert.ok(burgerSection);
  assert.ok(appetizerSection);
  assert.equal(burgerSection.items.find((item) => item.name === 'Beef Burger')?.qty, 2);
  assert.equal(burgerSection.items.find((item) => item.name === 'Chicken Burger')?.qty, 1);
  assert.equal(appetizerSection.items.find((item) => item.name === 'French Fries')?.qty, 1);

  console.log('reporting.test.js: OK');
};

run();
