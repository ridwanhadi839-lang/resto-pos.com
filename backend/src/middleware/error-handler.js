const { AppError } = require('../utils/app-error');
const { env } = require('../config/env');

const notFoundHandler = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} tidak ditemukan.`, 404));
};

const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Terjadi kesalahan pada server.';
  const details = env.nodeEnv === 'development' ? error.details || null : null;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    ok: false,
    error: message,
    details,
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
