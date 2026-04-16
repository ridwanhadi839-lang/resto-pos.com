const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
process.env.INTEGRATION_API_KEY = process.env.INTEGRATION_API_KEY || 'test-integration-key';

const testRestaurantCode = process.env.TEST_LOGIN_RESTAURANT_CODE;
const testLoginPin = process.env.TEST_LOGIN_PIN;

if (!testRestaurantCode || !testLoginPin) {
  throw new Error(
    'TEST_LOGIN_RESTAURANT_CODE dan TEST_LOGIN_PIN wajib diisi di backend/.env untuk menjalankan backend/tests/api.test.js'
  );
}

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

  // Kredensial test dibaca dari env lokal agar tidak terlihat di source code.
  const { response, json } = await requestJson('/api/auth/pin-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      restaurantCode: testRestaurantCode,
      pin: testLoginPin,
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
  assert.equal(session.user.restaurantCode, testRestaurantCode);
  assert.match(session.user.role, /cashier|supervisor|kitchen|owner|admin/);
};

const testDashboardFoundation = async () => {
  const authHeaders = await getAuthHeaders();
  const session = await login();

  const endpoints = [
    '/api/dashboard/outlets',
    '/api/dashboard/devices',
    '/api/dashboard/device-sessions',
    '/api/dashboard/cash-shifts',
  ];

  for (const endpoint of endpoints) {
    const result = await requestJson(endpoint, {
      headers: authHeaders,
    });

    assert.equal(result.response.status, 200);
    assert.equal(result.json?.ok, true);
    assert.ok(Array.isArray(result.json?.data));
  }

  const outletsResult = await requestJson('/api/dashboard/outlets', {
    headers: authHeaders,
  });
  assert.ok(outletsResult.json?.data?.some((outlet) => outlet.code === 'MAIN'));

  const createOutletResult = await requestJson('/api/dashboard/outlets', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: `TEST_${Date.now()}`,
      name: 'Automated Test Outlet',
    }),
  });

  if (session.user.role === 'cashier' || session.user.role === 'kitchen') {
    assert.equal(createOutletResult.response.status, 403);
    assert.equal(createOutletResult.json?.ok, false);
  } else {
    assert.equal(createOutletResult.response.status, 201);
    assert.equal(createOutletResult.json?.ok, true);
    const createdOutletId = createOutletResult.json?.data?.id;
    assert.ok(createdOutletId);

    await supabaseAdmin
      .from('outlets')
      .delete()
      .eq('id', createdOutletId)
      .eq('restaurant_id', session.user.restaurantId);
  }
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
    orderNote: 'Tanpa sambal, saus terpisah',
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
        options: ['Less ice', 'Extra sauce'],
        note: 'Pisahkan sambal',
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
  assert.equal(createResult.json?.data?.orderNote, 'Tanpa sambal, saus terpisah');
  assert.deepEqual(createResult.json?.data?.items?.[0]?.options, ['Less ice', 'Extra sauce']);
  assert.equal(createResult.json?.data?.items?.[0]?.note, 'Pisahkan sambal');
  createdOrderIds.push(createResult.json.data.id);

  const retryResult = await requestJson('/api/orders', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  assert.equal(retryResult.response.status, 201);
  assert.equal(retryResult.json?.ok, true);
  assert.equal(retryResult.json?.data?.id, createResult.json.data.id);
  assert.equal(retryResult.json?.data?.orderNumber, orderNumber);

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

const testCreateExternalOrder = async () => {
  const authHeaders = await getAuthHeaders();
  const catalogResult = await requestJson('/api/catalog', {
    headers: authHeaders,
  });

  assert.equal(catalogResult.response.status, 200);
  assert.ok(catalogResult.json?.data?.products?.length > 0);

  const product = catalogResult.json.data.products[0];
  const suffix = Date.now();
  const price = Number(product.price);

  const payload = {
    orderNumber: `EXT-${suffix}`,
    sourceApp: 'grabfood',
    externalOrderId: `GF-${suffix}`,
    items: [
      {
        id: `cart-external-${suffix}`,
        product: {
          id: product.id,
          name: product.name,
          price,
          imageUrl: product.imageUrl ?? null,
          categoryId: product.categoryId,
        },
        quantity: 1,
        options: ['No onion'],
        note: 'Paket aplikasi partner',
      },
    ],
    orderNote: 'Driver tunggu di depan',
    subtotal: price,
    discount: 0,
    tax: 0,
    total: price,
    splitBillCount: 1,
    payments: [],
    status: 'pending',
    orderType: 'delivery',
    customer: {
      name: 'Customer External',
      phone: '081234567890',
      receiptNo: `RCPT-EXT-${suffix}`,
    },
    externalPayload: {
      channel: 'grabfood',
      rawOrderNumber: `GF-${suffix}`,
    },
  };

  const createResult = await requestJson('/api/orders/external', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-restaurant-code': testRestaurantCode,
      'x-integration-api-key': process.env.INTEGRATION_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  assert.equal(createResult.response.status, 201);
  assert.equal(createResult.json?.ok, true);
  assert.equal(createResult.json?.data?.orderSource, 'external');
  assert.equal(createResult.json?.data?.sourceApp, payload.sourceApp);
  assert.equal(createResult.json?.data?.externalOrderId, payload.externalOrderId);
  assert.equal(createResult.json?.data?.orderNote, payload.orderNote);
  assert.deepEqual(createResult.json?.data?.items?.[0]?.options, ['No onion']);
  createdOrderIds.push(createResult.json.data.id);
};

const testDeleteCustomerContact = async () => {
  const authHeaders = await getAuthHeaders();
  const suffix = Date.now();

  const createContactResult = await requestJson('/api/customer-contacts', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `Delete Contact ${suffix}`,
      phone: `055${String(suffix).slice(-7)}`,
    }),
  });

  assert.equal(createContactResult.response.status, 201);
  assert.equal(createContactResult.json?.ok, true);

  const createdContact = createContactResult.json?.data?.find(
    (contact) => contact.name === `Delete Contact ${suffix}`
  );

  assert.ok(createdContact?.id);

  const deleteContactResult = await requestJson(`/api/customer-contacts/${createdContact.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });

  assert.equal(deleteContactResult.response.status, 200);
  assert.equal(deleteContactResult.json?.ok, true);
  assert.ok(
    !(deleteContactResult.json?.data ?? []).some((contact) => contact.id === createdContact.id)
  );
};

const run = async () => {
  try {
    await startServer();
    await testLogin();
    await testCreateOrder();
    await testCreateExternalOrder();
    await testDeleteCustomerContact();
    await testDashboardFoundation();
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
