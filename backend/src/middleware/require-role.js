const { AppError } = require('../utils/app-error');

const requireRole = (...allowedRoles) => (req, _res, next) => {
  if (!req.auth?.role) {
    return next(new AppError('Sesi login tidak memiliki role.', 403));
  }

  if (!allowedRoles.includes(req.auth.role)) {
    return next(new AppError('Role user tidak diizinkan mengakses endpoint ini.', 403));
  }

  next();
};

module.exports = {
  requireRole,
};
