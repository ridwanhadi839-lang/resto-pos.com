const express = require('express');

const {
  createOrder,
  createVoidAuditLog,
  getOrders,
  updateOrderStatus,
} = require('../services/order.service');
const { requireAuthSession } = require('../middleware/auth-session');
const { writeActionRateLimiter } = require('../middleware/rate-limiters');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

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
