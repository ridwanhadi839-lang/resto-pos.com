const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../utils/app-error');
const { ensureNonEmptyString, requireSupabaseAdmin } = require('../utils/validation');
const { requireRestaurantByCode } = require('./restaurant.service');

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

const getCatalog = async (restaurantCode) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);

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
