const jwt = require('jsonwebtoken');

const { env } = require('../config/env');
const { AppError } = require('../utils/app-error');
const { requireJwtSecret } = require('../utils/validation');

const createSessionToken = (payload) => {
  requireJwtSecret();

  return jwt.sign(
    {
      restaurantUserId: payload.restaurantUserId,
      restaurantId: payload.restaurantId,
      restaurantCode: payload.restaurantCode,
      role: payload.role,
    },
    env.jwtSecret,
    {
      subject: payload.userId,
      expiresIn: env.jwtExpiresIn,
    }
  );
};

const verifySessionToken = (token) => {
  requireJwtSecret();

  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Token sesi tidak valid atau sudah kedaluwarsa.', 401);
  }
};

module.exports = {
  createSessionToken,
  verifySessionToken,
};
