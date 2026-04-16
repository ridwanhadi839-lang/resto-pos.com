const bcrypt = require('bcryptjs');

const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../utils/app-error');
const { ensureNonEmptyString, requireSupabaseAdmin } = require('../utils/validation');
const { requireRestaurantByCode } = require('./restaurant.service');

const VALID_DEVICE_PLATFORMS = new Set(['android', 'ios', 'web', 'unknown']);
const VALID_DEVICE_STATUSES = new Set(['active', 'disabled', 'revoked']);
const VALID_DEVICE_SESSION_STATUSES = new Set(['active', 'revoked', 'expired']);

const normalizeOptionalText = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeCode = (value, label) => {
  const normalized = ensureNonEmptyString(value, `${label} wajib diisi.`).toUpperCase();
  if (!/^[A-Z0-9_-]{2,64}$/.test(normalized)) {
    throw new AppError(`${label} hanya boleh berisi A-Z, angka, underscore, dan tanda hubung.`, 400);
  }

  return normalized;
};

const ensureUuid = (value, label) => {
  const normalized = ensureNonEmptyString(value, `${label} wajib diisi.`);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw new AppError(`${label} tidak valid.`, 400);
  }

  return normalized;
};

const ensureBoolean = (value, defaultValue = true) => {
  if (typeof value === 'undefined') return defaultValue;
  return Boolean(value);
};

const ensureDevicePlatform = (value) => {
  const platform = normalizeOptionalText(value) || 'android';
  if (!VALID_DEVICE_PLATFORMS.has(platform)) {
    throw new AppError('Platform device tidak valid.', 400);
  }

  return platform;
};

const ensureDeviceStatus = (value, defaultValue = 'active') => {
  const status = normalizeOptionalText(value) || defaultValue;
  if (!VALID_DEVICE_STATUSES.has(status)) {
    throw new AppError('Status device tidak valid.', 400);
  }

  return status;
};

const ensureDeviceSessionStatus = (value, defaultValue = 'active') => {
  const status = normalizeOptionalText(value) || defaultValue;
  if (!VALID_DEVICE_SESSION_STATUSES.has(status)) {
    throw new AppError('Status sesi device tidak valid.', 400);
  }

  return status;
};

const mapOutlet = (row) => ({
  id: row.id,
  restaurantId: row.restaurant_id,
  code: row.code,
  name: row.name,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapDevice = (row) => ({
  id: row.id,
  restaurantId: row.restaurant_id,
  outletId: row.outlet_id,
  deviceCode: row.device_code,
  deviceName: row.device_name,
  platform: row.platform,
  status: row.status,
  lastSeenAt: row.last_seen_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapDeviceSession = (row) => ({
  id: row.id,
  restaurantId: row.restaurant_id,
  restaurantUserId: row.restaurant_user_id,
  deviceId: row.device_id,
  status: row.status,
  startedAt: row.started_at,
  lastSeenAt: row.last_seen_at,
  endedAt: row.ended_at,
  metadata: row.metadata || {},
  device: row.device
    ? {
        id: row.device.id,
        deviceCode: row.device.device_code,
        deviceName: row.device.device_name,
        outletId: row.device.outlet_id,
        status: row.device.status,
      }
    : null,
  restaurantUser: row.restaurant_user
    ? {
        id: row.restaurant_user.id,
        role: row.restaurant_user.role,
        user: row.restaurant_user.user
          ? {
              id: row.restaurant_user.user.id,
              name: row.restaurant_user.user.name,
            }
          : null,
      }
    : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapCashShift = (row) => ({
  id: row.id,
  restaurantId: row.restaurant_id,
  outletId: row.outlet_id,
  deviceId: row.device_id,
  openedByUserId: row.opened_by_user_id,
  closedByUserId: row.closed_by_user_id,
  openingBalance: Number(row.opening_balance ?? 0),
  closingBalance: row.closing_balance == null ? null : Number(row.closing_balance),
  expectedCash: row.expected_cash == null ? null : Number(row.expected_cash),
  cashDifference: row.cash_difference == null ? null : Number(row.cash_difference),
  status: row.status,
  openedAt: row.opened_at,
  closedAt: row.closed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const requireOutletInRestaurant = async (restaurantId, outletId) => {
  const normalizedOutletId = ensureUuid(outletId, 'Outlet ID');
  const { data, error } = await supabaseAdmin
    .from('outlets')
    .select('id')
    .eq('id', normalizedOutletId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) {
    throw new AppError('Gagal memeriksa outlet.', 500, error);
  }

  if (!data) {
    throw new AppError('Outlet tidak ditemukan untuk restoran ini.', 404);
  }

  return normalizedOutletId;
};

const requireDeviceInRestaurant = async (restaurantId, deviceId) => {
  const normalizedDeviceId = ensureUuid(deviceId, 'Device ID');
  const { data, error } = await supabaseAdmin
    .from('devices')
    .select('id')
    .eq('id', normalizedDeviceId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) {
    throw new AppError('Gagal memeriksa device.', 500, error);
  }

  if (!data) {
    throw new AppError('Device tidak ditemukan untuk restoran ini.', 404);
  }

  return normalizedDeviceId;
};

const requireRestaurantUserInRestaurant = async (restaurantId, restaurantUserId) => {
  const normalizedRestaurantUserId = ensureUuid(restaurantUserId, 'Restaurant user ID');
  const { data, error } = await supabaseAdmin
    .from('restaurant_users')
    .select('id')
    .eq('id', normalizedRestaurantUserId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) {
    throw new AppError('Gagal memeriksa user restoran.', 500, error);
  }

  if (!data) {
    throw new AppError('User restoran tidak ditemukan untuk restoran ini.', 404);
  }

  return normalizedRestaurantUserId;
};

const listOutlets = async (restaurantCode) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);

  const { data, error } = await supabaseAdmin
    .from('outlets')
    .select('id, restaurant_id, code, name, is_active, created_at, updated_at')
    .eq('restaurant_id', restaurant.id)
    .order('code');

  if (error) {
    throw new AppError('Gagal mengambil daftar outlet.', 500, error);
  }

  return (data || []).map(mapOutlet);
};

const createOutlet = async (restaurantCode, payload) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const code = normalizeCode(payload?.code, 'Kode outlet');
  const name = ensureNonEmptyString(payload?.name, 'Nama outlet wajib diisi.');

  const { data, error } = await supabaseAdmin
    .from('outlets')
    .insert({
      restaurant_id: restaurant.id,
      code,
      name,
      is_active: ensureBoolean(payload?.isActive, true),
    })
    .select('id, restaurant_id, code, name, is_active, created_at, updated_at')
    .single();

  if (error) {
    throw new AppError('Gagal membuat outlet.', 400, error);
  }

  return mapOutlet(data);
};

const updateOutlet = async (restaurantCode, outletId, payload) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const normalizedOutletId = await requireOutletInRestaurant(restaurant.id, outletId);
  const updatePayload = {};

  if (typeof payload?.code !== 'undefined') {
    updatePayload.code = normalizeCode(payload.code, 'Kode outlet');
  }
  if (typeof payload?.name !== 'undefined') {
    updatePayload.name = ensureNonEmptyString(payload.name, 'Nama outlet wajib diisi.');
  }
  if (typeof payload?.isActive !== 'undefined') {
    updatePayload.is_active = Boolean(payload.isActive);
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new AppError('Tidak ada data outlet yang diubah.', 400);
  }

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('outlets')
    .update(updatePayload)
    .eq('id', normalizedOutletId)
    .eq('restaurant_id', restaurant.id)
    .select('id, restaurant_id, code, name, is_active, created_at, updated_at')
    .single();

  if (error) {
    throw new AppError('Gagal mengubah outlet.', 400, error);
  }

  return mapOutlet(data);
};

const listDevices = async (restaurantCode) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);

  const { data, error } = await supabaseAdmin
    .from('devices')
    .select('id, restaurant_id, outlet_id, device_code, device_name, platform, status, last_seen_at, created_at, updated_at')
    .eq('restaurant_id', restaurant.id)
    .order('device_code');

  if (error) {
    throw new AppError('Gagal mengambil daftar device.', 500, error);
  }

  return (data || []).map(mapDevice);
};

const createDevice = async (restaurantCode, payload) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const outletId = payload?.outletId
    ? await requireOutletInRestaurant(restaurant.id, payload.outletId)
    : null;
  const deviceCode = normalizeCode(payload?.deviceCode, 'Kode device');
  const deviceName = ensureNonEmptyString(payload?.deviceName, 'Nama device wajib diisi.');
  const activationSecret = normalizeOptionalText(payload?.activationSecret);

  const insertPayload = {
    restaurant_id: restaurant.id,
    outlet_id: outletId,
    device_code: deviceCode,
    device_name: deviceName,
    platform: ensureDevicePlatform(payload?.platform),
    status: ensureDeviceStatus(payload?.status, 'active'),
  };

  if (activationSecret) {
    insertPayload.activation_secret_hash = await bcrypt.hash(activationSecret, 10);
  }

  const { data, error } = await supabaseAdmin
    .from('devices')
    .insert(insertPayload)
    .select('id, restaurant_id, outlet_id, device_code, device_name, platform, status, last_seen_at, created_at, updated_at')
    .single();

  if (error) {
    throw new AppError('Gagal membuat device.', 400, error);
  }

  return mapDevice(data);
};

const updateDevice = async (restaurantCode, deviceId, payload) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const normalizedDeviceId = await requireDeviceInRestaurant(restaurant.id, deviceId);
  const updatePayload = {};

  if (typeof payload?.outletId !== 'undefined') {
    updatePayload.outlet_id = payload.outletId
      ? await requireOutletInRestaurant(restaurant.id, payload.outletId)
      : null;
  }
  if (typeof payload?.deviceCode !== 'undefined') {
    updatePayload.device_code = normalizeCode(payload.deviceCode, 'Kode device');
  }
  if (typeof payload?.deviceName !== 'undefined') {
    updatePayload.device_name = ensureNonEmptyString(payload.deviceName, 'Nama device wajib diisi.');
  }
  if (typeof payload?.platform !== 'undefined') {
    updatePayload.platform = ensureDevicePlatform(payload.platform);
  }
  if (typeof payload?.status !== 'undefined') {
    updatePayload.status = ensureDeviceStatus(payload.status);
  }
  if (typeof payload?.activationSecret !== 'undefined') {
    const activationSecret = normalizeOptionalText(payload.activationSecret);
    updatePayload.activation_secret_hash = activationSecret
      ? await bcrypt.hash(activationSecret, 10)
      : null;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new AppError('Tidak ada data device yang diubah.', 400);
  }

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('devices')
    .update(updatePayload)
    .eq('id', normalizedDeviceId)
    .eq('restaurant_id', restaurant.id)
    .select('id, restaurant_id, outlet_id, device_code, device_name, platform, status, last_seen_at, created_at, updated_at')
    .single();

  if (error) {
    throw new AppError('Gagal mengubah device.', 400, error);
  }

  return mapDevice(data);
};

const listDeviceSessions = async (restaurantCode) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);

  const { data, error } = await supabaseAdmin
    .from('device_sessions')
    .select(`
      id,
      restaurant_id,
      restaurant_user_id,
      device_id,
      status,
      started_at,
      last_seen_at,
      ended_at,
      metadata,
      created_at,
      updated_at,
      device:devices (
        id,
        device_code,
        device_name,
        outlet_id,
        status
      ),
      restaurant_user:restaurant_users (
        id,
        role,
        user:users (
          id,
          name
        )
      )
    `)
    .eq('restaurant_id', restaurant.id)
    .order('last_seen_at', { ascending: false });

  if (error) {
    throw new AppError('Gagal mengambil sesi device.', 500, error);
  }

  return (data || []).map(mapDeviceSession);
};

const createDeviceSession = async (restaurantCode, payload) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const restaurantUserId = await requireRestaurantUserInRestaurant(
    restaurant.id,
    payload?.restaurantUserId
  );
  const deviceId = await requireDeviceInRestaurant(restaurant.id, payload?.deviceId);
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('device_sessions')
    .insert({
      restaurant_id: restaurant.id,
      restaurant_user_id: restaurantUserId,
      device_id: deviceId,
      status: ensureDeviceSessionStatus(payload?.status, 'active'),
      last_seen_at: now,
      metadata: payload?.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
        ? payload.metadata
        : {},
    })
    .select('id')
    .single();

  if (error) {
    throw new AppError('Gagal membuat sesi device.', 400, error);
  }

  const sessions = await listDeviceSessions(restaurantCode);
  return sessions.find((session) => session.id === data.id) || null;
};

const revokeDeviceSession = async (restaurantCode, sessionId) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const normalizedSessionId = ensureUuid(sessionId, 'Session ID');
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('device_sessions')
    .update({
      status: 'revoked',
      ended_at: now,
      updated_at: now,
    })
    .eq('id', normalizedSessionId)
    .eq('restaurant_id', restaurant.id)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new AppError('Gagal mencabut sesi device.', 400, error);
  }

  if (!data) {
    throw new AppError('Sesi device tidak ditemukan untuk restoran ini.', 404);
  }
};

const listCashShifts = async (restaurantCode) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);

  const { data, error } = await supabaseAdmin
    .from('cash_shifts')
    .select(`
      id,
      restaurant_id,
      outlet_id,
      device_id,
      opened_by_user_id,
      closed_by_user_id,
      opening_balance,
      closing_balance,
      expected_cash,
      cash_difference,
      status,
      opened_at,
      closed_at,
      created_at,
      updated_at
    `)
    .eq('restaurant_id', restaurant.id)
    .order('opened_at', { ascending: false });

  if (error) {
    throw new AppError('Gagal mengambil cash shift.', 500, error);
  }

  return (data || []).map(mapCashShift);
};

module.exports = {
  createDevice,
  createDeviceSession,
  createOutlet,
  listCashShifts,
  listDeviceSessions,
  listDevices,
  listOutlets,
  revokeDeviceSession,
  updateDevice,
  updateOutlet,
};
