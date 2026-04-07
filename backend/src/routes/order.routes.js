const express = require('express');

const {
  createOrder,
  createExternalOrder,
  createVoidAuditLog,
  getOrders,
  updateOrderStatus,
} = require('../services/order.service');
const { requireAuthSession } = require('../middleware/auth-session');
const {
  externalOrderRateLimiter,
  writeActionRateLimiter,
} = require('../middleware/rate-limiters');
const { requireIntegrationApiKey } = require('../middleware/integration-api-key');
const { requireRestaurantContext } = require('../middleware/restaurant-context');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.post(
  '/external',
  externalOrderRateLimiter,
  requireRestaurantContext,
  requireIntegrationApiKey,
  asyncHandler(async (req, res) => {
    const order = await createExternalOrder(req.restaurantCode, req.body || {});

    res.status(201).json({
      ok: true,
      data: order,
    });
  })
);

router.use(requireAuthSession);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orders = await getOrders(req.restaurantCode);

    res.json({
      ok: true,
      data: orders,
    });
  })
);

router.post(
  '/',
  writeActionRateLimiter,
  asyncHandler(async (req, res) => {
    const order = await createOrder(req.restaurantCode, req.body || {}, req.auth);

    res.status(201).json({
      ok: true,
      data: order,
    });
  })
);

router.patch(
  '/:id/status',
  writeActionRateLimiter,
  asyncHandler(async (req, res) => {
    await updateOrderStatus(req.restaurantCode, req.params.id, req.body?.status, req.auth);

    res.json({
      ok: true,
      message: 'Status order berhasil diperbarui.',
    });
  })
);

router.post(
  '/audit/void',
  writeActionRateLimiter,
  asyncHandler(async (req, res) => {
    const auditEntry = await createVoidAuditLog(req.restaurantCode, req.body || {}, req.auth);

    res.status(201).json({
      ok: true,
      message: 'Audit log void berhasil dicatat.',
      data: auditEntry,
    });
  })
);

module.exports = router;
