const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../utils/app-error');
const { ensureNonEmptyString, requireSupabaseAdmin } = require('../utils/validation');
const { requireRestaurantByCode } = require('./restaurant.service');
const { logDiscountApplied, logOrderStatusChanged, logVoidAudit } = require('./audit-log.service');

const VALID_ORDER_STATUSES = new Set(['pending', 'paid', 'sent_to_kitchen']);
const VALID_ORDER_TYPES = new Set(['dine-in', 'takeaway', 'delivery']);
const VALID_PAYMENT_METHODS = new Set(['cash', 'qr', 'visa']);

const mapDbOrder = (row) => ({
  id: row.id,
  orderNumber: row.order_number,
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
      options: [],
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

const fetchOrdersQuery = (restaurantId) => {
  requireSupabaseAdmin(supabaseAdmin);

  return supabaseAdmin
    .from('orders')
    .select(
      `
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
    `
    )
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
};

const getOrders = async (restaurantCode) => {
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const { data, error } = await fetchOrdersQuery(restaurant.id);

  if (error) {
    throw new AppError('Gagal mengambil data order.', 500, error);
  }

  return (data || []).map(mapDbOrder);
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

const createOrder = async (restaurantCode, payload, actor = null) => {
  requireSupabaseAdmin(supabaseAdmin);
  ensureValidOrderPayload(payload);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  await ensureProductsBelongToRestaurant(restaurant.id, payload.items);

  const { data: orderRow, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      restaurant_id: restaurant.id,
      order_number: payload.orderNumber.trim(),
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
    })
    .select('id')
    .single();

  if (orderError || !orderRow) {
    throw new AppError('Gagal membuat order.', 400, orderError);
  }

  const orderItemsPayload = payload.items.map((item) => ({
    order_id: orderRow.id,
    product_id: item.product.id,
    qty: Number(item.quantity),
    price: Number(item.product.price),
  }));

  const paymentsPayload = payload.payments
    .filter((payment) => Number(payment.amount) > 0)
    .map((payment) => ({
      order_id: orderRow.id,
      method: payment.method,
      amount: Number(payment.amount),
    }));

  if (orderItemsPayload.length > 0) {
    const { error: orderItemsError } = await supabaseAdmin.from('order_items').insert(orderItemsPayload);

    if (orderItemsError) {
      throw new AppError('Order dibuat, tapi item order gagal disimpan.', 400, orderItemsError);
    }
  }

  if (paymentsPayload.length > 0) {
    const { error: paymentsError } = await supabaseAdmin.from('payments').insert(paymentsPayload);

    if (paymentsError) {
      throw new AppError('Order dibuat, tapi data pembayaran gagal disimpan.', 400, paymentsError);
    }
  }

  const orders = await getOrders(restaurantCode);
  const createdOrder = orders.find((order) => order.id === orderRow.id);

  if (!createdOrder) {
    throw new AppError('Order tersimpan, tapi gagal dimuat ulang.', 500);
  }

  await logDiscountApplied({
    restaurantId: restaurant.id,
    actor,
    orderId: orderRow.id,
    orderNumber: createdOrder.orderNumber,
    payload,
  });

  return createdOrder;
};

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
  updateOrderStatus,
  createVoidAuditLog,
};
