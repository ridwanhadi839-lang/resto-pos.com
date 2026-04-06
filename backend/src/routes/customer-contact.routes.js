const express = require('express');

const {
  deleteCustomerContact,
  getCustomerContacts,
  upsertCustomerContact,
} = require('../services/customer-contact.service');
const { requireAuthSession } = require('../middleware/auth-session');
const { writeActionRateLimiter } = require('../middleware/rate-limiters');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.use(requireAuthSession);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const contacts = await getCustomerContacts(req.restaurantCode);

    res.json({
      ok: true,
      data: contacts,
    });
  })
);

router.post(
  '/',
  writeActionRateLimiter,
  asyncHandler(async (req, res) => {
    const contacts = await upsertCustomerContact(req.restaurantCode, req.body || {});

    res.status(201).json({
      ok: true,
      data: contacts,
    });
  })
);

router.delete(
  '/:id',
  writeActionRateLimiter,
  asyncHandler(async (req, res) => {
    const contacts = await deleteCustomerContact(req.restaurantCode, req.params.id);

    res.json({
      ok: true,
      data: contacts,
      message: 'Customer berhasil dihapus.',
    });
  })
);

module.exports = router;
