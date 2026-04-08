const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../utils/app-error');
const { ensureRestaurantCode, requireSupabaseAdmin } = require('../utils/validation');

const RESTAURANT_CACHE_TTL_MS = 5 * 60 * 1000;
const MEMBERSHIP_CACHE_TTL_MS = 15 * 1000;
const restaurantCache = new Map();
const membershipCache = new Map();

const getValidCachedEntry = (cache, key) => {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const setCachedEntry = (cache, key, value, ttlMs) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
};

const cloneRestaurant = (restaurant) => (restaurant ? { ...restaurant } : restaurant);

const buildMembershipCacheKey = ({ restaurantUserId, restaurantId, restaurantCode, userId }) =>
  [restaurantUserId, restaurantId, restaurantCode, userId].join(':');

const cloneMembership = (membership) =>
  membership
    ? {
        ...membership,
        restaurant: membership.restaurant ? { ...membership.restaurant } : membership.restaurant,
        user: membership.user ? { ...membership.user } : membership.user,
      }
    : membership;

const requireRestaurantByCode = async (restaurantCode) => {
  requireSupabaseAdmin(supabaseAdmin);
  const normalizedCode = ensureRestaurantCode(restaurantCode);
  const cachedRestaurant = getValidCachedEntry(restaurantCache, normalizedCode);
  if (cachedRestaurant) {
    return cloneRestaurant(cachedRestaurant);
  }

  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .select('id, code, name')
    .eq('code', normalizedCode)
    .maybeSingle();

  if (error) {
    throw new AppError('Gagal mengambil data restoran.', 500, error);
  }

  if (!data) {
    throw new AppError('Restoran tidak ditemukan.', 404);
  }

  setCachedEntry(restaurantCache, normalizedCode, data, RESTAURANT_CACHE_TTL_MS);
  return cloneRestaurant(data);
};

const requireActiveRestaurantUserMembership = async ({
  restaurantUserId,
  restaurantId,
  restaurantCode,
  userId,
}) => {
  requireSupabaseAdmin(supabaseAdmin);
  const cacheKey = buildMembershipCacheKey({
    restaurantUserId,
    restaurantId,
    restaurantCode,
    userId,
  });
  const cachedMembership = getValidCachedEntry(membershipCache, cacheKey);
  if (cachedMembership) {
    return cloneMembership(cachedMembership);
  }

  const { data, error } = await supabaseAdmin
    .from('restaurant_users')
    .select(
      `
      id,
      role,
      restaurant:restaurants!inner (
        id,
        code,
        name
      ),
      user:users!inner (
        id,
        auth_user_id,
        name
      )
    `
    )
    .eq('id', restaurantUserId)
    .eq('restaurant_id', restaurantId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError('Gagal memeriksa sesi user restoran.', 500, error);
  }

  if (!data) {
    throw new AppError('Membership restoran untuk sesi ini tidak ditemukan.', 401);
  }

  if (data.restaurant.code !== restaurantCode) {
    throw new AppError('Data sesi restoran tidak konsisten.', 401);
  }

  setCachedEntry(membershipCache, cacheKey, data, MEMBERSHIP_CACHE_TTL_MS);
  setCachedEntry(restaurantCache, data.restaurant.code, data.restaurant, RESTAURANT_CACHE_TTL_MS);

  return cloneMembership(data);
};

module.exports = {
  requireRestaurantByCode,
  requireActiveRestaurantUserMembership,
};
