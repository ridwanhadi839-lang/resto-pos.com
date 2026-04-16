const express = require('express');

const {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getCatalog,
  updateCategory,
  updateProduct,
} = require('../services/catalog.service');
const { requireAuthSession } = require('../middleware/auth-session');
const { writeActionRateLimiter } = require('../middleware/rate-limiters');
const { requireRole } = require('../middleware/require-role');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();
const requireCatalogManager = requireRole('owner', 'admin', 'supervisor');

router.use(requireAuthSession);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const startedAt = Date.now();
    const catalog = await getCatalog({
      id: req.auth?.restaurantId,
      code: req.restaurantCode,
      name: req.auth?.restaurantName,
    });
    const durationMs = Date.now() - startedAt;

    if (durationMs > 300) {
      console.info(`[catalog] ${req.restaurantCode} loaded in ${durationMs}ms`);
    }

    res.json({
      ok: true,
      data: catalog,
    });
  })
);

router.post(
  '/categories',
  writeActionRateLimiter,
  requireCatalogManager,
  asyncHandler(async (req, res) => {
    const category = await createCategory(req.restaurantCode, req.body?.name);

    res.status(201).json({
      ok: true,
      data: category,
    });
  })
);

router.patch(
  '/categories/:id',
  writeActionRateLimiter,
  requireCatalogManager,
  asyncHandler(async (req, res) => {
    const category = await updateCategory(req.restaurantCode, req.params.id, req.body?.name);

    res.json({
      ok: true,
      data: category,
    });
  })
);

router.delete(
  '/categories/:id',
  writeActionRateLimiter,
  requireCatalogManager,
  asyncHandler(async (req, res) => {
    await deleteCategory(req.restaurantCode, req.params.id);

    res.json({
      ok: true,
      message: 'Kategori berhasil dihapus.',
    });
  })
);

router.post(
  '/products',
  writeActionRateLimiter,
  requireCatalogManager,
  asyncHandler(async (req, res) => {
    const product = await createProduct(req.restaurantCode, req.body || {});

    res.status(201).json({
      ok: true,
      data: product,
    });
  })
);

router.patch(
  '/products/:id',
  writeActionRateLimiter,
  requireCatalogManager,
  asyncHandler(async (req, res) => {
    const product = await updateProduct(req.restaurantCode, req.params.id, req.body || {});

    res.json({
      ok: true,
      data: product,
    });
  })
);

router.delete(
  '/products/:id',
  writeActionRateLimiter,
  requireCatalogManager,
  asyncHandler(async (req, res) => {
    await deleteProduct(req.restaurantCode, req.params.id);

    res.json({
      ok: true,
      message: 'Produk berhasil dihapus.',
    });
  })
);

module.exports = router;
