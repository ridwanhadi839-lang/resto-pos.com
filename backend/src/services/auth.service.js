const bcrypt = require('bcryptjs');

const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../utils/app-error');
const {
  ensureRestaurantCode,
  ensureSixDigitPin,
  requireSupabaseAdmin,
} = require('../utils/validation');
const { requireRestaurantByCode } = require('./restaurant.service');
const { createSessionToken } = require('./session.service');

const mapUserRow = (row, restaurant) => ({
  id: row.user.id,
  name: row.user.name,
  role: row.role,
  restaurantId: restaurant.id,
  restaurantCode: restaurant.code,
  restaurantName: restaurant.name,
});

const signInWithPin = async (restaurantCode, pin) => {
  const normalizedRestaurantCode = ensureRestaurantCode(restaurantCode);
  ensureSixDigitPin(pin);
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(normalizedRestaurantCode);

  const { data, error } = await supabaseAdmin
    .from('restaurant_users')
    .select(
      `
      id,
      role,
      pin_hash,
      pin_code,
      user:users!inner (
        id,
        name
      )
    `
    )
    .eq('restaurant_id', restaurant.id);

  if (error) {
    throw new AppError('Gagal memeriksa PIN user di database.', 500, error);
  }

  const users = data || [];
  if (users.length === 0) {
    throw new AppError('PIN tidak ditemukan.', 401);
  }

  const matchingUsers = [];
  for (const row of users) {
    if (row.pin_hash) {
      const matches = await bcrypt.compare(pin, row.pin_hash);
      if (matches) matchingUsers.push(row);
      continue;
    }

    if (row.pin_code && row.pin_code === pin) {
      matchingUsers.push(row);
    }
  }

  if (matchingUsers.length === 0) {
    throw new AppError('PIN tidak ditemukan.', 401);
  }

  if (matchingUsers.length > 1) {
    throw new AppError(
      'PIN dipakai oleh lebih dari satu user dalam restoran ini. Gunakan PIN yang unik.',
      409
    );
  }

  const userRow = matchingUsers[0];
  const user = mapUserRow(userRow, restaurant);
  const accessToken = createSessionToken({
    userId: userRow.user.id,
    restaurantUserId: userRow.id,
    restaurantId: restaurant.id,
    restaurantCode: restaurant.code,
    role: userRow.role,
  });

  return {
    user,
    accessToken,
  };
};

module.exports = {
  signInWithPin,
};
