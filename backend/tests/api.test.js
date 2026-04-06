const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = require('../src/app');
const { supabaseAdmin } = require('../src/config/supabase');

let server;
let baseUrl;
let authSession;
const createdOrderIds = [];

const startServer = () =>
  new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

const stopServer = () =>
  new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const cleanupCreatedOrders = async () => {
  if (!supabaseAdmin || createdOrderIds.length === 0) return;

  await supabaseAdmin.from('payments').delete().in('order_id', createdOrderIds);
  await supabaseAdmin.from('order_items').delete().in('order_id', createdOrderIds);
  await supabaseAdmin.from('orders').delete().in('id', createdOrderIds);
};

const requestJson = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  return { response, json };
};

const login = async () => {
  if (authSession) return authSession;

  const { response, json } = await requestJson('/api/auth/pin-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      restaurantCode: 'resto-a',
      pin: '445566',
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(json?.ok, true);
  assert.ok(json?.data?.accessToken);

  authSession = json.data;
  return authSession;
};

const getAuthHeaders = async () => {
  const session = await login();

  return {
    Authorization: `Bearer ${session.accessToken}`,
    'x-restaurant-code': session.user.restaurantCode,
  };
};

const testLogin = async () => {
  const session = await login();

  assert.ok(session.user);
  assert.equal(session.user.restaurantCode, 'resto-a');
  assert.match(session.user.role, /cashier|supervisor|kitchen/);
};

const testCreateOrder = async () => {
  const authHeaders = await getAuthHeaders();
  const catalogResult = await requestJson('/api/catalog', {
    headers: authHeaders,
  });

  assert.equal(catalogResult.response.status, 200);
  assert.ok(catalogResult.json?.data?.products?.length > 0);

  const product = catalogResult.json.data.products[0];
  const orderNumber = `TEST-${Date.now()}`;
  const price = Number(product.price);

  const payload = {
    orderNumber,
    items: [
      {
        id: `cart-${Date.now()}`,
        product: {
          id: product.id,
          name: product.name,
          price,
          imageUrl: product.imageUrl ?? null,
          categoryId: product.categoryId,
        },
        quantity: 1,
        options: [],
      },
    ],
    subtotal: price,
    discount: 0,
    tax: 0,
    total: price,
    splitBillCount: 1,
    payments: [{ id: `pay-${Date.now()}`, method: 'cash', amount: price }],
    status: 'paid',
    orderType: 'takeaway',
    customer: {
      name: 'Automated Test',
      phone: '0500000000',
      receiptNo: `RCPT-${Date.now()}`,
    },
  };

  const createResult = await requestJson('/api/orders', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  assert.equal(createResult.response.status, 201);
  assert.equal(createResult.json?.ok, true);
  assert.equal(createResult.json?.data?.orderNumber, orderNumber);
  assert.equal(createResult.json?.data?.status, 'paid');
  createdOrderIds.push(createResult.json.data.id);

  const ordersResult = await requestJson('/api/orders', {
    headers: authHeaders,
  });

  assert.equal(ordersResult.response.status, 200);
  assert.ok(
    ordersResult.json?.data?.some(
      (order) => order.id === createResult.json.data.id && order.orderNumber === orderNumber
    )
  );

  const statusResult = await requestJson(`/api/orders/${createResult.json.data.id}/status`, {
    method: 'PATCH',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'sent_to_kitchen' }),
  });

  assert.equal(statusResult.response.status, 200);
  assert.equal(statusResult.json?.ok, true);

  const voidAuditResult = await requestJson('/api/orders/audit/void', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderNumber: `VOID-${Date.now()}`,
      reason: 'Wrong Order',
      subtotal: price,
      discount: 0,
      tax: 0,
      total: price,
      itemCount: 1,
      orderType: 'takeaway',
      customerName: 'Automated Test',
      customerPhone: '0500000000',
    }),
  });

  assert.equal(voidAuditResult.response.status, 201);
  assert.equal(voidAuditResult.json?.ok, true);
};

const run = async () => {
  try {
    await startServer();
    await testLogin();
    await testCreateOrder();
    console.log('backend/tests/api.test.js: OK');
  } finally {
    await cleanupCreatedOrders();
    await stopServer();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
