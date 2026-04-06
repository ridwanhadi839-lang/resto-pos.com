const { supabaseAdmin } = require('../config/supabase');
const { requireSupabaseAdmin, ensureNonEmptyString } = require('../utils/validation');
const { AppError } = require('../utils/app-error');
const { requireRestaurantByCode } = require('./restaurant.service');

let hasWarnedMissingAuditTable = false;

const AUDIT_ACTIONS = {
  ORDER_DISCOUNT_APPLIED: 'order_discount_applied',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  ORDER_VOIDED: 'order_voided',
};

const AUDIT_ENTITY_TYPES = {
  ORDER: 'order',
  CART: 'cart',
};

const isMissingAuditTableError = (error) =>
  error?.code === '42P01' ||
  String(error?.message || '').toLowerCase().includes('audit_logs');

const writeAuditLog = async ({
  restaurantId,
  restaurantUserId,
  userId,
  entityType,
  action,
  orderId = null,
  orderNumber = null,
  reason = null,
  metadata = {},
}) => {
  requireSupabaseAdmin(supabaseAdmin);

  const { error } = await supabaseAdmin.from('audit_logs').insert({
    restaurant_id: restaurantId,
    restaurant_user_id: restaurantUserId || null,
    user_id: userId || null,
    entity_type: entityType,
    action,
    order_id: orderId,
    order_number: orderNumber,
    reason,
    metadata,
  });

  if (!error) {
    return true;
  }

  if (isMissingAuditTableError(error)) {
    if (!hasWarnedMissingAuditTable) {
      hasWarnedMissingAuditTable = true;
      console.warn(
        'Audit log dilewati karena tabel public.audit_logs belum tersedia. Jalankan migration audit log sebelum production.'
      );
    }
    return false;
  }

  console.error('Gagal menulis audit log:', error);
  return false;
};

const logDiscountApplied = async ({ restaurantId, actor, orderId, orderNumber, payload }) => {
  if (!Number.isFinite(Number(payload.discount)) || Number(payload.discount) <= 0) {
    return false;
  }

  return writeAuditLog({
    restaurantId,
    restaurantUserId: actor?.restaurantUserId,
    userId: actor?.userId,
    entityType: AUDIT_ENTITY_TYPES.ORDER,
    action: AUDIT_ACTIONS.ORDER_DISCOUNT_APPLIED,
    orderId,
    orderNumber,
    metadata: {
      subtotal: Number(payload.subtotal),
      discount: Number(payload.discount),
      tax: Number(payload.tax),
      total: Number(payload.total),
      itemCount: Array.isArray(payload.items) ? payload.items.length : 0,
      orderType: payload.orderType,
    },
  });
};

const logOrderStatusChanged = async ({
  restaurantId,
  actor,
  orderId,
  orderNumber,
  previousStatus,
  nextStatus,
}) =>
  writeAuditLog({
    restaurantId,
    restaurantUserId: actor?.restaurantUserId,
    userId: actor?.userId,
    entityType: AUDIT_ENTITY_TYPES.ORDER,
    action: AUDIT_ACTIONS.ORDER_STATUS_CHANGED,
    orderId,
    orderNumber,
    metadata: {
      previousStatus,
      nextStatus,
    },
  });

const ensureVoidAuditPayload = (payload) => {
  const orderNumber = ensureNonEmptyString(payload?.orderNumber, 'Nomor order wajib diisi.');
  const reason = ensureNonEmptyString(payload?.reason, 'Alasan cancel wajib diisi.');

  const numberFields = [
    ['subtotal', payload?.subtotal],
    ['discount', payload?.discount],
    ['tax', payload?.tax],
    ['total', payload?.total],
    ['itemCount', payload?.itemCount],
  ];

  for (const [label, value] of numberFields) {
    if (!Number.isFinite(Number(value)) || Number(value) < 0) {
      throw new AppError(`Field ${label} harus berupa angka valid.`, 400);
    }
  }

  return {
    orderNumber,
    reason,
    subtotal: Number(payload.subtotal),
    discount: Number(payload.discount),
    tax: Number(payload.tax),
    total: Number(payload.total),
    itemCount: Number(payload.itemCount),
    orderType: typeof payload?.orderType === 'string' ? payload.orderType : null,
    customerName: typeof payload?.customerName === 'string' ? payload.customerName.trim() : '',
    customerPhone: typeof payload?.customerPhone === 'string' ? payload.customerPhone.trim() : '',
  };
};

const logVoidAudit = async (restaurantCode, actor, payload) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const normalized = ensureVoidAuditPayload(payload);

  await writeAuditLog({
    restaurantId: restaurant.id,
    restaurantUserId: actor?.restaurantUserId,
    userId: actor?.userId,
    entityType: AUDIT_ENTITY_TYPES.CART,
    action: AUDIT_ACTIONS.ORDER_VOIDED,
    orderNumber: normalized.orderNumber,
    reason: normalized.reason,
    metadata: {
      subtotal: normalized.subtotal,
      discount: normalized.discount,
      tax: normalized.tax,
      total: normalized.total,
      itemCount: normalized.itemCount,
      orderType: normalized.orderType,
      customerName: normalized.customerName || null,
      customerPhone: normalized.customerPhone || null,
    },
  });

  return normalized;
};

module.exports = {
  AUDIT_ACTIONS,
  logDiscountApplied,
  logOrderStatusChanged,
  logVoidAudit,
};
