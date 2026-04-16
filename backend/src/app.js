const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { env, assertEnvConfig } = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const authRoutes = require('./routes/auth.routes');
const catalogRoutes = require('./routes/catalog.routes');
const customerContactRoutes = require('./routes/customer-contact.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const healthRoutes = require('./routes/health.routes');
const orderRoutes = require('./routes/order.routes');

assertEnvConfig();

const app = express();
const allowedOrigins = env.corsOrigins;

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin tidak diizinkan oleh konfigurasi CORS.'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'x-restaurant-code',
      'x-integration-api-key',
    ],
  })
);
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    message: 'RestaurantPOS backend is running.',
    docs: {
      health: '/api/health',
      auth: '/api/auth',
      catalog: '/api/catalog',
      customerContacts: '/api/customer-contacts',
      dashboard: '/api/dashboard',
      orders: '/api/orders',
      externalOrders: '/api/orders/external',
    },
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/customer-contacts', customerContactRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/orders', orderRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
