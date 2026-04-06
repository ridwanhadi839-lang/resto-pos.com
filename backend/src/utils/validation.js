const { AppError } = require('./app-error');
const { env } = require('../config/env');

const ensureNonEmptyString = (value, message) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(message, 400);
  }

  return value.trim();
};

const ensureSixDigitPin = (pin) => {
  const normalizedPin = ensureNonEmptyString(pin, 'PIN wajib diisi.');

  if (!/^[0-9]{6}$/.test(normalizedPin)) {
    throw new AppError('PIN harus terdiri dari 6 digit angka.', 400);
  }

  return normalizedPin;
};

const ensureRestaurantCode = (restaurantCode) => {
  const normalizedCode = ensureNonEmptyString(
    restaurantCode,
    'Kode restoran wajib diisi.'
  ).toLowerCase();

  if (!/^[a-z0-9-]+$/.test(normalizedCode)) {
    throw new AppError(
      'Kode restoran hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
      400
    );
  }

  return normalizedCode;
};

const requireSupabaseAdmin = (client) => {
  if (!client) {
    throw new AppError(
      'Supabase admin client belum siap. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env backend.',
      500
    );
  }
};

const requireJwtSecret = () => {
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new AppError(
      'JWT_SECRET backend belum aman atau belum diisi. Gunakan secret minimal 32 karakter.',
      500
    );
  }
};

module.exports = {
  ensureNonEmptyString,
  ensureSixDigitPin,
  ensureRestaurantCode,
  requireSupabaseAdmin,
  requireJwtSecret,
};
