const { timingSafeEqual } = require('node:crypto');

const { env } = require('../config/env');
const { AppError } = require('../utils/app-error');

const keysMatch = (expected, incoming) => {
  const expectedBuffer = Buffer.from(expected);
  const incomingBuffer = Buffer.from(incoming);

  if (expectedBuffer.length !== incomingBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, incomingBuffer);
};

const requireIntegrationApiKey = (req, _res, next) => {
  try {
    if (!env.integrationApiKey) {
      throw new AppError(
        'INTEGRATION_API_KEY backend belum diisi. Endpoint order external belum bisa dipakai.',
        503
      );
    }

    const incomingApiKey = String(req.headers['x-integration-api-key'] || '').trim();
    if (!incomingApiKey) {
      throw new AppError('Header x-integration-api-key wajib dikirim.', 401);
    }

    if (!keysMatch(env.integrationApiKey, incomingApiKey)) {
      throw new AppError('API key integrasi tidak valid.', 401);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireIntegrationApiKey,
};
