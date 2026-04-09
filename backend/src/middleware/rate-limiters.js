const { ipKeyGenerator, rateLimit } = require('express-rate-limit');

const normalizeRestaurantCode = (value) =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim().toLowerCase()
    : 'unknown-restaurant';

const pinLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip)}:${normalizeRestaurantCode(req.body?.restaurantCode)}`,
  message: {
    ok: false,
    error: 'Terlalu banyak percobaan login PIN. Coba lagi dalam 15 menit.',
  },
});

const writeActionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Terlalu banyak aksi dalam waktu singkat. Coba lagi sebentar.',
  },
});

const externalOrderRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Terlalu banyak order external dalam waktu singkat. Coba lagi sebentar.',
  },
});

module.exports = {
  pinLoginRateLimiter,
  writeActionRateLimiter,
  externalOrderRateLimiter,
};
