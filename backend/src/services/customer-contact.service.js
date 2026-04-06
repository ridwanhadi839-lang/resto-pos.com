const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../utils/app-error');
const { ensureNonEmptyString, requireSupabaseAdmin } = require('../utils/validation');
const { requireRestaurantByCode } = require('./restaurant.service');

const normalizeName = (value) => ensureNonEmptyString(value, 'Nama customer wajib diisi.');
const normalizePhone = (value) =>
  ensureNonEmptyString(value, 'Nomor telepon customer wajib diisi.').replace(/[^\d+]/g, '');

const mapCustomerContact = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  updatedAt: row.updated_at,
});

const getCustomerContacts = async (restaurantCode) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);

  const { data, error } = await supabaseAdmin
    .from('customer_contacts')
    .select('id, name, phone, updated_at')
    .eq('restaurant_id', restaurant.id)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new AppError('Gagal mengambil daftar customer.', 500, error);
  }

  return (data || []).map(mapCustomerContact);
};

const upsertCustomerContact = async (restaurantCode, payload) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const name = normalizeName(payload?.name);
  const phone = normalizePhone(payload?.phone);
  const normalizedName = name.toLowerCase();
  const now = new Date().toISOString();

  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from('customer_contacts')
    .select('id, name, phone')
    .eq('restaurant_id', restaurant.id);

  if (existingError) {
    throw new AppError('Gagal memeriksa customer yang sudah ada.', 500, existingError);
  }

  const duplicate = (existingRows || []).find(
    (contact) =>
      contact.phone.replace(/[^\d+]/g, '') === phone || contact.name.trim().toLowerCase() === normalizedName
  );

  if (duplicate) {
    const { error: updateError } = await supabaseAdmin
      .from('customer_contacts')
      .update({
        name,
        phone,
        updated_at: now,
      })
      .eq('id', duplicate.id)
      .eq('restaurant_id', restaurant.id);

    if (updateError) {
      throw new AppError('Gagal memperbarui customer.', 500, updateError);
    }
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('customer_contacts')
      .insert({
        restaurant_id: restaurant.id,
        name,
        phone,
        updated_at: now,
      });

    if (insertError) {
      throw new AppError('Gagal menyimpan customer baru.', 500, insertError);
    }
  }

  return getCustomerContacts(restaurantCode);
};

const deleteCustomerContact = async (restaurantCode, contactId) => {
  requireSupabaseAdmin(supabaseAdmin);
  const restaurant = await requireRestaurantByCode(restaurantCode);
  const normalizedId = ensureNonEmptyString(contactId, 'ID customer wajib diisi.');

  const { error } = await supabaseAdmin
    .from('customer_contacts')
    .delete()
    .eq('id', normalizedId)
    .eq('restaurant_id', restaurant.id);

  if (error) {
    throw new AppError('Gagal menghapus customer.', 500, error);
  }

  return getCustomerContacts(restaurantCode);
};

module.exports = {
  deleteCustomerContact,
  getCustomerContacts,
  upsertCustomerContact,
};
