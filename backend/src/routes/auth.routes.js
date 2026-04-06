const express = require('express');

const { signInWithPin } = require('../services/auth.service');
const { pinLoginRateLimiter } = require('../middleware/rate-limiters');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.post(
  '/pin-login',
  pinLoginRateLimiter,
  asyncHandler(async (req, res) => {
    const { user, accessToken } = await signInWithPin(
      req.body?.restaurantCode,
      req.body?.pin
    );

    res.json({
      ok: true,
      message: 'Login PIN berhasil.',
      data: {
        user,
        accessToken,
      },
    });
  })
);

module.exports = router;
