const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../utils/app-error');
const { ensureNonEmptyString, requireSupabaseAdmin } = require('../utils/validation');
const { requireRestaurantByCode } = require('./restaurant.service');
const { logDiscountApplied, logOrderStatusChanged, logVoidAudit } = require('./audit-log.service');

const VALID_ORDER_STATUSES = new Set(['pending', 'paid', 'sent_to_kitchen']);
const VALID_ORDER_TYPES = new Set(['dine-in', 'takeaway', 'delivery']);
const VALID_PAYMENT_METHODS = new Set(['cash', 'qr', 'visa']);
const VALID_ORDER_SOURCES = new Set(['pos', 'external']);

const sanitizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const sanitizeOptionalString = (value) => {
  const normalized = sanitizeString(value);
  return normalized.length > 0 ? normalized : null;
};

const sanitizeItemOptions = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
};

const sanitizeJsonObject = (value) => {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }

  return value;
};

const INTEGRATION_SCHEMA_COLUMNS = [
  'order_source',
  'source_app',
  'external_order_id',
  'external_payload',
  'order_note',
  'options',
  'note',
];

const isIntegrationSchemaError = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''}`;
  return (
    (error?.code === 'PGRST204' || error?.code === '42703') &&
    INTEGRATION_SCHEMA_COLUMNS.some((columnName) => message.includes(columnName))
  );
};

const BASE_ORDER_SELECT = `
  id,
  order_number,
  subtotal,
  discount_amount,
  tax_amount,
  total,
  status,
  order_type,
  customer_name,
  customer_phone,
  receipt_no,
  table_number,
  split_bill_count,
  created_at,
  order_items (
    id,
    qty,
    price,
    product:products (
      id,
      name,
      price,
      image_url,
      category_id
    )
  ),
  payments (
    id,
    method,
    amount
  )
`;

const EXTENDED_ORDER_SELECT = `
  id,
  order_number,
  order_source,
  source_app,
  external_order_id,
  external_payload,
  subtotal,
  discount_amount,
  tax_amount,
  total,
  status,
  order_type,
  order_note,
  customer_name,
  customer_phone,
  receipt_no,
  table_number,
  split_bill_count,
  created_at,
  order_items (
    id,
    qty,
    price,
    options,
    note,
    product:products (
      id,
      name,
      price,
      image_url,
      category_id
    )
  ),
  payments (
    id,
    method,
    amount
  )
`;

const mapDbOrder = (row) => ({
  id: row.id,
  orderNumber: row.order_number,
  orderNote: row.order_note || undefined,
  orderSource: row.order_source || 'pos',
  sourceApp: row.source_app || undefined,
  externalOrderId: row.external_order_id || undefined,
  externalPayload: sanitizeJsonObject(row.external_payload),
  items: (row.order_items || []).map((item) => {
    const productCandidate = Array.isArray(item.product) ? item.product[0] : item.product;
    return {
      id: item.id,
      product: {
        id: productCandidate?.id || `unknown-${item.id}`,
        name: productCandidate?.name || 'Unknown Product',
        price: Number(productCandidate?.price ?? item.price),
        imageUrl: productCandidate?.image_url || null,
        categoryId: productCandidate?.category_id || 'unknown',
      },
      quantity: item.qty,
      options: sanitizeItemOptions(item.options),
      note: item.note || undefined,
    };
  }),
  subtotal: Number(row.subtotal),
  discount: Number(row.discount_amount),
  tax: Number(row.tax_amount),
  total: Number(row.total),
  splitBillCount: row.split_bill_count,
  payments: (row.payments || []).map((payment) => ({
    id: payment.id,
    method: payment.method,
    amount: Number(payment.amount),
  })),
  status: row.status,
  orderType: row.order_type,
  customer: {
    name: row.customer_name || '',
    phone: row.customer_phone || '',
    receiptNo: row.receipt_no || '',
  },
  tableNumber: row.table_number || undefined,
  createdAt: row.created_at,
  synced: true,
});

const hydrateOrderWithPayload = (order, payload) => ({
  ...order,
  orderNote: payload.orderNote ?? order.orderNote,
  orderSource: payload.orderSource ?? order.orderSource ?? 'pos',
  sourceApp: payload.sourceApp ?? order.sourceApp,
  externalOrderId: payload.externalOrderId ?? order.externalOrderId,
  externalPayload: payload.externalPayload ?? order.externalPayload ?? {},
  items: order.items.map((item, index) => ({
    ...item,
    options: payload.items?.[index]?.options ?? item.options ?? [],
    note: payload.items?.[index]?.note ?? item.note,
  })),
});

const ensureProductsBelongToRestaurant = async (restaurantId, items) => {
  const productIds = [...new Set(items.map((item) => item.product.id))];

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .in('id', productIds);

  if (error) {
    throw new AppError('Gagal memeriksa produk restoran.', 500, error);
  }

  if ((data || []).length !== productIds.length) {
    throw new AppError('Ada produk yang tidak dimiliki restoran ini.', 400);
  }
};

const fetchOrdersQuery = (restaurantId, includeIntegrationFields = true) => {
  requireSupabaseAdmin(supabaseAdmin);

  return supabaseAdmin
    .from('orders')
    .select(includeIntegrationFields ? EXTENDED_ORDER_SELECT : BASE_ORDER_SELECT)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
};

const fetchOrderRows = async (restaurantId, includeIntegrationFields = true) => {
  const { data, error } = await fetchOrdersQuery(restaurantId, includeIntegrationFields);

  if (error && includeIntegrationFields && isIntegrationSchemaError(error)) {
    return fetchOrderRows(restaurantId, false);
  }

  if (error) {
    throw new AppError('Gagal mengambil data order.', 500, error);
  }

  return data || [];
};

const getOrders = async (restaurantCode) => {
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const data = await fetchOrderRows(restaurant.id);
  return data.map(mapDbOrder);
};

const ensureValidOrderPayload = (payload) => {
  ensureNonEmptyString(payload.orderNumber, 'Nomor order wajib diisi.');

  if (!VALID_ORDER_TYPES.has(payload.orderType)) {
    throw new AppError('Tipe order tidak valid.', 400);
  }

  if (!VALID_ORDER_STATUSES.has(payload.status)) {
    throw new AppError('Status order tidak valid.', 400);
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new AppError('Order harus memiliki minimal satu item.', 400);
  }

  if (!Array.isArray(payload.payments)) {
    throw new AppError('Payload payments harus berupa array.', 400);
  }

  const orderSource = payload.orderSource || 'pos';
  if (!VALID_ORDER_SOURCES.has(orderSource)) {
    throw new AppError('Sumber order tidak valid.', 400);
  }

  if (payload.orderSource === 'external') {
    ensureNonEmptyString(payload.sourceApp, 'sourceApp wajib diisi untuk order external.');
    ensureNonEmptyString(
      payload.externalOrderId,
      'externalOrderId wajib diisi untuk order external.'
    );
  }

  if (
    payload.externalPayload != null &&
    (typeof payload.externalPayload !== 'object' || Array.isArray(payload.externalPayload))
  ) {
    throw new AppError('externalPayload harus berupa object JSON.', 400);
  }

  if (payload.orderNote != null && typeof payload.orderNote !== 'string') {
    throw new AppError('orderNote harus berupa text.', 400);
  }

  const numberFields = [
    ['subtotal', payload.subtotal],
    ['discount', payload.discount],
    ['tax', payload.tax],
    ['total', payload.total],
    ['splitBillCount', payload.splitBillCount],
  ];

  for (const [label, value] of numberFields) {
    if (!Number.isFinite(Number(value))) {
      throw new AppError(`Field ${label} harus berupa angka.`, 400);
    }
  }

  for (const item of payload.items) {
    if (!item?.product?.id) {
      throw new AppError('Setiap item order harus memiliki product.id.', 400);
    }

    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
      throw new AppError('Quantity item harus lebih dari 0.', 400);
    }

    if (!Number.isFinite(Number(item.product.price)) || Number(item.product.price) < 0) {
      throw new AppError('Harga item tidak valid.', 400);
    }

    if (item.options != null && !Array.isArray(item.options)) {
      throw new AppError('Options item harus berupa array.', 400);
    }

    if (
      Array.isArray(item.options) &&
      item.options.some((option) => typeof option !== 'string')
    ) {
      throw new AppError('Semua options item harus berupa text.', 400);
    }

    if (item.note != null && typeof item.note !== 'string') {
      throw new AppError('Note item harus berupa text.', 400);
    }
  }

  for (const payment of payload.payments) {
    if (!VALID_PAYMENT_METHODS.has(payment.method)) {
      throw new AppError('Metode pembayaran tidak valid.', 400);
    }

    if (!Number.isFinite(Number(payment.amount)) || Number(payment.amount) < 0) {
      throw new AppError('Nominal pembayaran tidak valid.', 400);
    }
  }
};

const getOrderById = async (restaurantId, orderId) => {
  let { data, error } = await fetchOrdersQuery(restaurantId, true).eq('id', orderId).maybeSingle();

  if (error && isIntegrationSchemaError(error)) {
    ({ data, error } = await fetchOrdersQuery(restaurantId, false).eq('id', orderId).maybeSingle());
  }

  if (error) {
    throw new AppError('Gagal memuat ulang order.', 500, error);
  }

  if (!data) {
    throw new AppError('Order tidak ditemukan setelah disimpan.', 404);
  }

  return mapDbOrder(data);
};

const findExistingExternalOrder = async (restaurantId, sourceApp, externalOrderId) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('source_app', sourceApp)
    .eq('external_order_id', externalOrderId)
    .maybeSingle();

  if (error && isIntegrationSchemaError(error)) {
    return null;
  }

  if (error) {
    throw new AppError('Gagal memeriksa external order yang sudah ada.', 500, error);
  }

  return data;
};

const buildOrderInsertPayload = (restaurantId, payload, includeIntegrationFields = true) => ({
  restaurant_id: restaurantId,
  order_number: payload.orderNumber.trim(),
  ...(includeIntegrationFields
    ? {
        order_source: payload.orderSource || 'pos',
        source_app: sanitizeOptionalString(payload.sourceApp),
        external_order_id: sanitizeOptionalString(payload.externalOrderId),
        external_payload: sanitizeJsonObject(payload.externalPayload),
        order_note: sanitizeOptionalString(payload.orderNote),
      }
    : {}),
  subtotal: Number(payload.subtotal),
  discount_amount: Number(payload.discount),
  tax_amount: Number(payload.tax),
  total: Number(payload.total),
  status: payload.status,
  order_type: payload.orderType,
  customer_name: payload.customer?.name?.trim() || null,
  customer_phone: payload.customer?.phone?.trim() || null,
  receipt_no: payload.customer?.receiptNo?.trim() || null,
  table_number: payload.tableNumber ? String(payload.tableNumber).trim() : null,
  split_bill_count: Number(payload.splitBillCount),
  cashier_user_id: payload.cashierUserId || null,
});

const insertOrderRow = async (restaurantId, payload, includeIntegrationFields = true) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .insert(buildOrderInsertPayload(restaurantId, payload, includeIntegrationFields))
    .select('id')
    .single();

  if (error && includeIntegrationFields && isIntegrationSchemaError(error)) {
    return insertOrderRow(restaurantId, payload, false);
  }

  if (error || !data) {
    throw new AppError('Gagal membuat order.', 400, error);
  }

  return {
    row: data,
    persistedIntegrationFields: includeIntegrationFields,
  };
};

const buildOrderItemsPayload = (orderId, items, includeIntegrationFields = true) =>
  items.map((item) => ({
    order_id: orderId,
    product_id: item.product.id,
    qty: Number(item.quantity),
    price: Number(item.product.price),
    ...(includeIntegrationFields
      ? {
          options: sanitizeItemOptions(item.options),
          note: sanitizeOptionalString(item.note),
        }
      : {}),
  }));

const insertOrderItems = async (orderId, items, includeIntegrationFields = true) => {
  const payload = buildOrderItemsPayload(orderId, items, includeIntegrationFields);
  if (payload.length === 0) return includeIntegrationFields;

  const { error } = await supabaseAdmin.from('order_items').insert(payload);

  if (error && includeIntegrationFields && isIntegrationSchemaError(error)) {
    return insertOrderItems(orderId, items, false);
  }

  if (error) {
    throw new AppError('Order dibuat, tapi item order gagal disimpan.', 400, error);
  }

  return includeIntegrationFields;
};

const createOrder = async (restaurantCode, payload, actor = null) => {
  requireSupabaseAdmin(supabaseAdmin);
  ensureValidOrderPayload(payload);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  await ensureProductsBelongToRestaurant(restaurant.id, payload.items);
  const orderSource = payload.orderSource || 'pos';
  const sourceApp = sanitizeOptionalString(payload.sourceApp);
  const externalOrderId = sanitizeOptionalString(payload.externalOrderId);

  if (orderSource === 'external' && sourceApp && externalOrderId) {
    const existingExternalOrder = await findExistingExternalOrder(
      restaurant.id,
      sourceApp,
      externalOrderId
    );

    if (existingExternalOrder?.id) {
      return getOrderById(restaurant.id, existingExternalOrder.id);
    }
  }

  const { row: orderRow, persistedIntegrationFields: orderFieldsPersisted } =
    await insertOrderRow(restaurant.id, payload, true);

  const paymentsPayload = payload.payments
    .filter((payment) => Number(payment.amount) > 0)
    .map((payment) => ({
      order_id: orderRow.id,
      method: payment.method,
      amount: Number(payment.amount),
    }));

  const itemFieldsPersisted = await insertOrderItems(orderRow.id, payload.items, true);

  if (paymentsPayload.length > 0) {
    const { error: paymentsError } = await supabaseAdmin.from('payments').insert(paymentsPayload);

    if (paymentsError) {
      throw new AppError('Order dibuat, tapi data pembayaran gagal disimpan.', 400, paymentsError);
    }
  }

  const createdOrder = await getOrderById(restaurant.id, orderRow.id);

  await logDiscountApplied({
    restaurantId: restaurant.id,
    actor,
    orderId: orderRow.id,
    orderNumber: createdOrder.orderNumber,
    payload,
  });

  if (!orderFieldsPersisted || !itemFieldsPersisted) {
    return hydrateOrderWithPayload(createdOrder, payload);
  }

  return createdOrder;
};

const createExternalOrder = async (restaurantCode, payload) =>
  // External order selalu dipaksa lewat jalur backend ini supaya validasi,
  // dedup external_order_id, dan audit tetap terjadi di satu tempat.
  createOrder(
    restaurantCode,
    {
      ...payload,
      orderSource: 'external',
      sourceApp: sanitizeOptionalString(payload.sourceApp),
      externalOrderId: sanitizeOptionalString(payload.externalOrderId),
      externalPayload: sanitizeJsonObject(payload.externalPayload || payload),
      status: payload.status || 'pending',
      payments: Array.isArray(payload.payments) ? payload.payments : [],
    },
    null
  );

const updateOrderStatus = async (restaurantCode, orderId, status, actor = null) => {
  requireSupabaseAdmin(supabaseAdmin);
  ensureNonEmptyString(orderId, 'Order ID wajib diisi.');
  const restaurant = await requireRestaurantByCode(restaurantCode);

  if (!VALID_ORDER_STATUSES.has(status)) {
    throw new AppError('Status order tidak valid.', 400);
  }

  const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, status')
    .eq('id', orderId)
    .eq('restaurant_id', restaurant.id)
    .maybeSingle();

  if (existingOrderError) {
    throw new AppError('Gagal mengambil order sebelum ubah status.', 400, existingOrderError);
  }

  if (!existingOrder) {
    throw new AppError('Order tidak ditemukan.', 404);
  }

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('restaurant_id', restaurant.id);

  if (error) {
    throw new AppError('Gagal memperbarui status order.', 400, error);
  }

  if (existingOrder.status !== status) {
    await logOrderStatusChanged({
      restaurantId: restaurant.id,
      actor,
      orderId: existingOrder.id,
      orderNumber: existingOrder.order_number,
      previousStatus: existingOrder.status,
      nextStatus: status,
    });
  }
};

const createVoidAuditLog = async (restaurantCode, payload, actor = null) =>
  logVoidAudit(restaurantCode, actor, payload);

module.exports = {
  getOrders,
  createOrder,
  createExternalOrder,
  updateOrderStatus,
  createVoidAuditLog,
};
