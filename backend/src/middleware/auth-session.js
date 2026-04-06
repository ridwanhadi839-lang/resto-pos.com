const { verifySessionToken } = require('../services/session.service');
const {
  ensureRestaurantCode,
  ensureNonEmptyString,
} = require('../utils/validation');
const { AppError } = require('../utils/app-error');
const { requireActiveRestaurantUserMembership } = require('../services/restaurant.service');

const getBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    throw new AppError('Token sesi wajib dikirim.', 401);
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Format Authorization harus Bearer <token>.', 401);
  }

  return ensureNonEmptyString(token, 'Token sesi wajib dikirim.');
};

const requireAuthSession = async (req, _res, next) => {
  try {
    const token = getBearerToken(req.headers.authorization);
    const decoded = verifySessionToken(token);
    if (typeof decoded === 'string') {
      throw new AppError('Payload token sesi tidak valid.', 401);
    }

    const session = await requireActiveRestaurantUserMembership({
      restaurantUserId: decoded.restaurantUserId,
      restaurantId: decoded.restaurantId,
      restaurantCode: decoded.restaurantCode,
      userId: decoded.sub,
    });

    const incomingRestaurantCode =
      req.headers['x-restaurant-code'] ||
      req.query.restaurantCode ||
      req.body?.restaurantCode;

    if (incomingRestaurantCode) {
      const normalizedIncomingRestaurantCode = ensureRestaurantCode(incomingRestaurantCode);
      if (normalizedIncomingRestaurantCode !== session.restaurant.code) {
        throw new AppError('Restoran pada request tidak cocok dengan sesi login.', 403);
      }
    }

    req.auth = {
      userId: session.user.id,
      restaurantUserId: session.id,
      restaurantId: session.restaurant.id,
      restaurantCode: session.restaurant.code,
      role: session.role,
    };
    req.restaurantCode = session.restaurant.code;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireAuthSession,
};
