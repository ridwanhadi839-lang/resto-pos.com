const { ensureRestaurantCode } = require('../utils/validation');

const requireRestaurantContext = (req, _res, next) => {
  const restaurantCode =
    req.headers['x-restaurant-code'] ||
    req.query.restaurantCode ||
    req.body?.restaurantCode;

  req.restaurantCode = ensureRestaurantCode(restaurantCode);
  next();
};

module.exports = {
  requireRestaurantContext,
};
