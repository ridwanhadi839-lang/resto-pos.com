const express = require('express');

const {
  createDevice,
  createDeviceSession,
  createOutlet,
  listCashShifts,
  listDeviceSessions,
  listDevices,
  listOutlets,
  revokeDeviceSession,
  updateDevice,
  updateOutlet,
} = require('../services/dashboard.service');
const { requireAuthSession } = require('../middleware/auth-session');
const { writeActionRateLimiter } = require('../middleware/rate-limiters');
const { requireRole } = require('../middleware/require-role');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();
const requireDashboardManager = requireRole('owner', 'admin', 'supervisor');

router.use(requireAuthSession);

router.get(
  '/outlets',
  asyncHandler(async (req, res) => {
    res.json({
      ok: true,
      data: await listOutlets(req.restaurantCode),
    });
  })
);

router.post(
  '/outlets',
  writeActionRateLimiter,
  requireDashboardManager,
  asyncHandler(async (req, res) => {
    res.status(201).json({
      ok: true,
      data: await createOutlet(req.restaurantCode, req.body || {}),
    });
  })
);

router.patch(
  '/outlets/:id',
  writeActionRateLimiter,
  requireDashboardManager,
  asyncHandler(async (req, res) => {
    res.json({
      ok: true,
      data: await updateOutlet(req.restaurantCode, req.params.id, req.body || {}),
    });
  })
);

router.get(
  '/devices',
  asyncHandler(async (req, res) => {
    res.json({
      ok: true,
      data: await listDevices(req.restaurantCode),
    });
  })
);

router.post(
  '/devices',
  writeActionRateLimiter,
  requireDashboardManager,
  asyncHandler(async (req, res) => {
    res.status(201).json({
      ok: true,
      data: await createDevice(req.restaurantCode, req.body || {}),
    });
  })
);

router.patch(
  '/devices/:id',
  writeActionRateLimiter,
  requireDashboardManager,
  asyncHandler(async (req, res) => {
    res.json({
      ok: true,
      data: await updateDevice(req.restaurantCode, req.params.id, req.body || {}),
    });
  })
);

router.get(
  '/device-sessions',
  asyncHandler(async (req, res) => {
    res.json({
      ok: true,
      data: await listDeviceSessions(req.restaurantCode),
    });
  })
);

router.post(
  '/device-sessions',
  writeActionRateLimiter,
  requireDashboardManager,
  asyncHandler(async (req, res) => {
    res.status(201).json({
      ok: true,
      data: await createDeviceSession(req.restaurantCode, req.body || {}),
    });
  })
);

router.patch(
  '/device-sessions/:id/revoke',
  writeActionRateLimiter,
  requireDashboardManager,
  asyncHandler(async (req, res) => {
    await revokeDeviceSession(req.restaurantCode, req.params.id);
    res.json({
      ok: true,
      message: 'Sesi device berhasil dicabut.',
    });
  })
);

router.get(
  '/cash-shifts',
  asyncHandler(async (req, res) => {
    res.json({
      ok: true,
      data: await listCashShifts(req.restaurantCode),
    });
  })
);

module.exports = router;
