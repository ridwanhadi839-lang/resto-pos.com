const express = require('express');

const {
  hasAdminClientConfig,
  hasPublicClientConfig,
} = require('../config/supabase');
const { env } = require('../config/env');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'backend',
    environment: env.nodeEnv,
    supabase: {
      publicClientReady: hasPublicClientConfig,
      adminClientReady: hasAdminClientConfig,
    },
  });
});

module.exports = router;
