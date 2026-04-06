const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../utils/app-error');
const { ensureRestaurantCode, requireSupabaseAdmin } = require('../utils/validation');

const requireRestaurantByCode = async (restaurantCode) => {
  requireSupabaseAdmin(supabaseAdmin);
  const normalizedCode = ensureRestaurantCode(restaurantCode);

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

  return data;
};

const requireActiveRestaurantUserMembership = async ({
  restaurantUserId,
  restaurantId,
  restaurantCode,
  userId,
}) => {
  requireSupabaseAdmin(supabaseAdmin);

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

  return data;
};

module.exports = {
  requireRestaurantByCode,
  requireActiveRestaurantUserMembership,
};
