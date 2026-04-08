const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../utils/app-error');
const { ensureNonEmptyString, requireSupabaseAdmin } = require('../utils/validation');
const { requireRestaurantByCode } = require('./restaurant.service');

const CATALOG_CACHE_TTL_MS = 30 * 1000;
const catalogCache = new Map();
const inflightCatalogRequests = new Map();

const mapCategory = (row) => ({
  id: row.id,
  name: row.name,
});

const mapProduct = (row) => ({
  id: row.id,
  name: row.name,
  price: Number(row.price),
  imageUrl: row.image_url,
  categoryId: row.category_id,
});

const cloneCatalog = (catalog) => ({
  categories: catalog.categories.map((category) => ({ ...category })),
  products: catalog.products.map((product) => ({ ...product })),
});

const readCatalogCache = (restaurantCode) => {
  const entry = catalogCache.get(restaurantCode);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    catalogCache.delete(restaurantCode);
    return null;
  }

  return cloneCatalog(entry.data);
};

const writeCatalogCache = (restaurantCode, catalog) => {
  catalogCache.set(restaurantCode, {
    data: cloneCatalog(catalog),
    expiresAt: Date.now() + CATALOG_CACHE_TTL_MS,
  });
};

const invalidateCatalogCache = (restaurantCode) => {
  if (!restaurantCode) return;

  catalogCache.delete(restaurantCode);
  inflightCatalogRequests.delete(restaurantCode);
};

const resolveRestaurantContext = async (restaurantOrCode) => {
  if (
    restaurantOrCode &&
    typeof restaurantOrCode === 'object' &&
    typeof restaurantOrCode.id === 'string' &&
    typeof restaurantOrCode.code === 'string'
  ) {
    return restaurantOrCode;
  }

  return requireRestaurantByCode(restaurantOrCode);
};

const ensureCategoryBelongsToRestaurant = async (restaurantId, categoryId) => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();

  if (error) {
    throw new AppError('Gagal memeriksa kategori restoran.', 500, error);
  }

  if (!data) {
    throw new AppError('Kategori tidak ditemukan untuk restoran ini.', 404);
  }
};

const fetchCatalogFromDatabase = async (restaurant) => {
  const [categoryResult, productResult] = await Promise.all([
    supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('restaurant_id', restaurant.id)
      .order('name'),
    supabaseAdmin
      .from('products')
      .select('id, name, price, image_url, category_id')
      .eq('restaurant_id', restaurant.id)
      .order('name'),
  ]);

  if (categoryResult.error || productResult.error) {
    throw new AppError(
      'Gagal mengambil data katalog.',
      500,
      categoryResult.error || productResult.error
    );
  }

  return {
    categories: (categoryResult.data || []).map(mapCategory),
    products: (productResult.data || []).map(mapProduct),
  };
};

const getCatalog = async (restaurantOrCode) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await resolveRestaurantContext(restaurantOrCode);
  const restaurantCode = restaurant.code;
  const cachedCatalog = readCatalogCache(restaurantCode);
  if (cachedCatalog) {
    return cachedCatalog;
  }

  const existingRequest = inflightCatalogRequests.get(restaurantCode);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const catalog = await fetchCatalogFromDatabase(restaurant);
    writeCatalogCache(restaurantCode, catalog);
    return cloneCatalog(catalog);
  })();

  inflightCatalogRequests.set(restaurantCode, request);

  try {
    return await request;
  } finally {
    inflightCatalogRequests.delete(restaurantCode);
  }
};

const createCategory = async (restaurantCode, name) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const normalizedName = ensureNonEmptyString(name, 'Nama kategori wajib diisi.');

  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({ restaurant_id: restaurant.id, name: normalizedName })
    .select('id, name')
    .single();

  if (error) {
    throw new AppError('Gagal membuat kategori.', 400, error);
  }

  invalidateCatalogCache(restaurantCode);
  return mapCategory(data);
};

const updateCategory = async (restaurantCode, id, name) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const normalizedName = ensureNonEmptyString(name, 'Nama kategori wajib diisi.');

  const { data, error } = await supabaseAdmin
    .from('categories')
    .update({ name: normalizedName })
    .eq('id', id)
    .eq('restaurant_id', restaurant.id)
    .select('id, name')
    .single();

  if (error) {
    throw new AppError('Gagal mengubah kategori.', 400, error);
  }

  invalidateCatalogCache(restaurantCode);
  return mapCategory(data);
};

const deleteCategory = async (restaurantCode, id) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);

  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurant.id);

  if (error) {
    throw new AppError('Gagal menghapus kategori.', 400, error);
  }

  invalidateCatalogCache(restaurantCode);
};

const normalizeProductInput = (input) => ({
  name: ensureNonEmptyString(input.name, 'Nama produk wajib diisi.'),
  price: Number(input.price),
  category_id: ensureNonEmptyString(input.categoryId, 'Category ID wajib diisi.'),
  image_url: input.imageUrl ? String(input.imageUrl).trim() : null,
});

const ensureValidProductPayload = (payload) => {
  if (!Number.isFinite(payload.price) || payload.price < 0) {
    throw new AppError('Harga produk harus berupa angka 0 atau lebih.', 400);
  }
};

const createProduct = async (restaurantCode, input) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const payload = normalizeProductInput(input);
  ensureValidProductPayload(payload);
  await ensureCategoryBelongsToRestaurant(restaurant.id, payload.category_id);

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      ...payload,
      restaurant_id: restaurant.id,
    })
    .select('id, name, price, image_url, category_id')
    .single();

  if (error) {
    throw new AppError('Gagal membuat produk.', 400, error);
  }

  invalidateCatalogCache(restaurantCode);
  return mapProduct(data);
};

const updateProduct = async (restaurantCode, id, input) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const payload = normalizeProductInput(input);
  ensureValidProductPayload(payload);
  await ensureCategoryBelongsToRestaurant(restaurant.id, payload.category_id);

  const { data, error } = await supabaseAdmin
    .from('products')
    .update({
      ...payload,
      restaurant_id: restaurant.id,
    })
    .eq('id', id)
    .eq('restaurant_id', restaurant.id)
    .select('id, name, price, image_url, category_id')
    .single();

  if (error) {
    throw new AppError('Gagal mengubah produk.', 400, error);
  }

  invalidateCatalogCache(restaurantCode);
  return mapProduct(data);
};

const deleteProduct = async (restaurantCode, id) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);

  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurant.id);

  if (error) {
    throw new AppError('Gagal menghapus produk.', 400, error);
  }

  invalidateCatalogCache(restaurantCode);
};

module.exports = {
  getCatalog,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
};
