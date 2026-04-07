import { RealtimeChannel } from '@supabase/supabase-js';
import { CATEGORIES, PRODUCTS } from '../data/mockData';
import { apiRequest, isApiConfigured } from '../lib/api';
import { assertSupabase, isSupabaseConfigured, supabase } from '../lib/supabase';
import { getCurrentRestaurantCode } from './authService';
import {
  Category,
  CreateOrderInput,
  Order,
  OrderStatus,
  PaymentLine,
  Product,
} from '../types';

type DbOrderRow = {
  id: string;
  order_number: string;
  order_source?: 'pos' | 'external' | null;
  source_app?: string | null;
  external_order_id?: string | null;
  external_payload?: Record<string, unknown> | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  status: OrderStatus;
  order_type: 'dine-in' | 'takeaway' | 'delivery';
  order_note: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  receipt_no: string | null;
  table_number: string | null;
  split_bill_count: number;
  created_at: string;
  order_items:
    | Array<{
        id: string;
        qty: number;
        price: number;
        options?: string[] | null;
        note?: string | null;
        product:
          | {
              id: string;
              name: string;
              price: number;
              image_url: string | null;
              category_id: string;
            }
          | Array<{
              id: string;
              name: string;
              price: number;
              image_url: string | null;
              category_id: string;
            }>
          | null;
      }>
    | null;
  payments:
    | Array<{
        id: string;
        method: 'cash' | 'qr' | 'visa';
        amount: number;
      }>
    | null;
};

export const hasRemoteOrderAccess = isApiConfigured || isSupabaseConfigured;
export const hasRemoteCatalogAccess = isApiConfigured || isSupabaseConfigured;
export const hasOrderRealtimeSync = !isApiConfigured && isSupabaseConfigured;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

const BASE_ORDER_SELECT = `
  id,
  order_number,
  subtotal,
  discount_amount,
  tax_amount,
  total,
  status,
  order_type,
  customer_name,
  customer_phone,
  receipt_no,
  table_number,
  split_bill_count,
  created_at,
  order_items (
    id,
    qty,
    price,
    product:products (
      id,
      name,
      price,
      image_url,
      category_id
    )
  ),
  payments (
    id,
    method,
    amount
  )
`;

export const isRetryableRemoteError = (error: unknown) => {
  const message = getErrorMessage(error);
  return (
    message.includes('tidak bisa terhubung') ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('network error') ||
    message.includes('timeout')
  );
};

const getRestaurantHeaders = async () => {
  const restaurantCode = await getCurrentRestaurantCode();

  if (!restaurantCode) {
    throw new Error('Kode restoran belum tersedia. Silakan login ulang.');
  }

  return {
    'x-restaurant-code': restaurantCode,
  };
};

const mapDbOrder = (row: DbOrderRow): Order => ({
  id: row.id,
  orderNumber: row.order_number,
  orderNote: row.order_note ?? undefined,
  orderSource: row.order_source ?? 'pos',
  sourceApp: row.source_app ?? undefined,
  externalOrderId: row.external_order_id ?? undefined,
  externalPayload:
    row.external_payload && typeof row.external_payload === 'object'
      ? row.external_payload
      : undefined,
  items: (row.order_items ?? []).map((item) => ({
    id: item.id,
    product: (() => {
      const productCandidate = Array.isArray(item.product) ? item.product[0] : item.product;
      return {
        id: productCandidate?.id ?? `unknown-${item.id}`,
        name: productCandidate?.name ?? 'Unknown Product',
        price: Number(productCandidate?.price ?? item.price),
        imageUrl: productCandidate?.image_url ?? null,
        categoryId: productCandidate?.category_id ?? 'unknown',
      };
    })(),
    quantity: item.qty,
    options: item.options ?? [],
    note: item.note ?? undefined,
  })),
  subtotal: Number(row.subtotal),
  discount: Number(row.discount_amount),
  tax: Number(row.tax_amount),
  total: Number(row.total),
  splitBillCount: row.split_bill_count,
  payments: (row.payments ?? []).map((payment) => ({
    id: payment.id,
    method: payment.method,
    amount: Number(payment.amount),
  })),
  status: row.status,
  orderType: row.order_type,
  customer: {
    name: row.customer_name ?? '',
    phone: row.customer_phone ?? '',
    receiptNo: row.receipt_no ?? '',
  },
  tableNumber: row.table_number ?? undefined,
  createdAt: row.created_at,
  synced: true,
});

const hydrateOrderWithPayload = (order: Order, payload: CreateOrderInput): Order => ({
  ...order,
  orderNote: payload.orderNote ?? order.orderNote,
  orderSource: payload.orderSource ?? order.orderSource ?? 'pos',
  sourceApp: payload.sourceApp ?? order.sourceApp,
  externalOrderId: payload.externalOrderId ?? order.externalOrderId,
  externalPayload: payload.externalPayload ?? order.externalPayload,
  items: order.items.map((item, index) => ({
    ...item,
    options: payload.items[index]?.options ?? item.options ?? [],
    note: payload.items[index]?.note ?? item.note,
  })),
});


const fetchOrdersQuery = async () => {
  const client = assertSupabase();
  return client
    .from('orders')
    .select(BASE_ORDER_SELECT)
    .order('created_at', { ascending: false });
};

const fetchOrderRows = async () => {
  const result = await fetchOrdersQuery();
  if (result.error) throw result.error;
  return result.data;
};

const buildOrderInsertPayload = (
  payload: CreateOrderInput,
  now: string
) => ({
  order_number: payload.orderNumber,
  subtotal: payload.subtotal,
  discount_amount: payload.discount,
  tax_amount: payload.tax,
  total: payload.total,
  status: payload.status,
  order_type: payload.orderType,
  // orderNote dan metadata integrasi disimpan penuh lewat backend Express.
  customer_name: payload.customer.name || null,
  customer_phone: payload.customer.phone || null,
  receipt_no: payload.customer.receiptNo || null,
  table_number: payload.tableNumber ?? null,
  split_bill_count: payload.splitBillCount,
  cashier_user_id: payload.cashierUserId ?? null,
  created_at: now,
});

const insertOrderRow = async (payload: CreateOrderInput, now: string) => {
  const client = assertSupabase();
  const result = await client
    .from('orders')
    .insert(buildOrderInsertPayload(payload, now))
    .select('id')
    .single();

  if (result.error || !result.data) {
    throw result.error ?? new Error('Gagal menyimpan order.');
  }

  return result.data;
};

const buildOrderItemsPayload = (orderId: string, payload: CreateOrderInput) =>
  payload.items.map((item) => ({
    order_id: orderId,
    product_id: item.product.id,
    qty: item.quantity,
    price: item.product.price,
  }));

const insertOrderItems = async (orderId: string, payload: CreateOrderInput) => {
  const client = assertSupabase();
  const orderItemsPayload = buildOrderItemsPayload(orderId, payload);
  if (orderItemsPayload.length === 0) return;

  const result = await client.from('order_items').insert(orderItemsPayload);

  if (result.error) {
    throw result.error;
  }
};

export const fetchCatalog = async (): Promise<{
  categories: Category[];
  products: Product[];
}> => {
  if (isApiConfigured) {
    const response = await apiRequest<{ categories: Category[]; products: Product[] }>(
      '/api/catalog',
      {
        headers: await getRestaurantHeaders(),
      }
    );

    return {
      categories: response.data?.categories ?? [],
      products: response.data?.products ?? [],
    };
  }

  if (!isSupabaseConfigured) {
    return { categories: CATEGORIES, products: PRODUCTS };
  }


  const client = assertSupabase();
  const [categoryResult, productResult] = await Promise.all([
    client.from('categories').select('id, name').order('name'),
    client
      .from('products')
      .select('id, name, price, image_url, category_id')
      .order('name'),
  ]);

  if (categoryResult.error || productResult.error) {
    throw categoryResult.error ?? productResult.error;
  }

  const categories: Category[] = (categoryResult.data ?? []).map((cat) => ({
    id: cat.id,
    name: cat.name,
  }));

  const products: Product[] = (productResult.data ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    price: Number(product.price),
    imageUrl: product.image_url,
    categoryId: product.category_id,
  }));

  return { categories, products };
};

export const createCategory = async (name: string): Promise<Category> => {
  if (isApiConfigured) {
    const response = await apiRequest<Category>('/api/catalog/categories', {
      method: 'POST',
      headers: await getRestaurantHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!response.data) throw new Error('Backend tidak mengembalikan kategori baru.');
    return response.data;
  }

  const client = assertSupabase();
  const { data, error } = await client
    .from('categories')
    .insert({ name: name.trim() })
    .select('id, name')
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name };
};

export const updateCategory = async (id: string, name: string): Promise<Category> => {
  if (isApiConfigured) {
    const response = await apiRequest<Category>(`/api/catalog/categories/${id}`, {
      method: 'PATCH',
      headers: await getRestaurantHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!response.data) throw new Error('Backend tidak mengembalikan kategori hasil update.');
    return response.data;
  }

  const client = assertSupabase();
  const { data, error } = await client
    .from('categories')
    .update({ name: name.trim() })
    .eq('id', id)
    .select('id, name')
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name };
};

export const deleteCategory = async (id: string): Promise<void> => {
  if (isApiConfigured) {
    await apiRequest(`/api/catalog/categories/${id}`, {
      method: 'DELETE',
      headers: await getRestaurantHeaders(),
    });
    return;
  }

  const client = assertSupabase();
  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) throw error;
};

interface UpsertProductInput {
  name: string;
  price: number;
  categoryId: string;
  imageUrl?: string | null;
}

export const createProduct = async (input: UpsertProductInput): Promise<Product> => {
  if (isApiConfigured) {
    const response = await apiRequest<Product>('/api/catalog/products', {
      method: 'POST',
      headers: await getRestaurantHeaders(),
      body: JSON.stringify(input),
    });
    if (!response.data) throw new Error('Backend tidak mengembalikan produk baru.');
    return response.data;
  }

  const client = assertSupabase();
  const { data, error } = await client
    .from('products')
    .insert({
      name: input.name.trim(),
      price: input.price,
      category_id: input.categoryId,
      image_url: input.imageUrl ?? null,
    })
    .select('id, name, price, image_url, category_id')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    price: Number(data.price),
    categoryId: data.category_id,
    imageUrl: data.image_url,
  };
};

export const updateProduct = async (
  id: string,
  input: UpsertProductInput
): Promise<Product> => {
  if (isApiConfigured) {
    const response = await apiRequest<Product>(`/api/catalog/products/${id}`, {
      method: 'PATCH',
      headers: await getRestaurantHeaders(),
      body: JSON.stringify(input),
    });
    if (!response.data) throw new Error('Backend tidak mengembalikan produk hasil update.');
    return response.data;
  }

  const client = assertSupabase();
  const { data, error } = await client
    .from('products')
    .update({
      name: input.name.trim(),
      price: input.price,
      category_id: input.categoryId,
      image_url: input.imageUrl ?? null,
    })
    .eq('id', id)
    .select('id, name, price, image_url, category_id')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    price: Number(data.price),
    categoryId: data.category_id,
    imageUrl: data.image_url,
  };
};

export const deleteProduct = async (id: string): Promise<void> => {
  if (isApiConfigured) {
    await apiRequest(`/api/catalog/products/${id}`, {
      method: 'DELETE',
      headers: await getRestaurantHeaders(),
    });
    return;
  }

  const client = assertSupabase();
  const { error } = await client.from('products').delete().eq('id', id);
  if (error) throw error;
};

export const fetchOrders = async (): Promise<Order[]> => {
  if (isApiConfigured) {
    const response = await apiRequest<Order[]>('/api/orders', {
      headers: await getRestaurantHeaders(),
    });
    return response.data ?? [];
  }

  if (!isSupabaseConfigured) return [];
  // Fallback direct-Supabase dipertahankan supaya app tetap hidup saat backend mati,
  // tetapi source of truth untuk metadata integration tetap backend Express.
  const data = await fetchOrderRows();
  return ((data as unknown as DbOrderRow[]) ?? []).map(mapDbOrder);
};

export const createOrder = async (payload: CreateOrderInput): Promise<Order> => {
  if (isApiConfigured) {
    const response = await apiRequest<Order>('/api/orders', {
      method: 'POST',
      headers: await getRestaurantHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.data) {
      throw new Error('Backend tidak mengembalikan data order baru.');
    }
    return response.data;
  }

  const client = assertSupabase();
  const now = new Date().toISOString();

  const orderRow = await insertOrderRow(payload, now);
  await insertOrderItems(orderRow.id, payload);

  const paymentsPayload = payload.payments
    .filter((payment) => payment.amount > 0)
    .map((payment) => ({
      order_id: orderRow.id,
      method: payment.method,
      amount: payment.amount,
    }));

  if (paymentsPayload.length > 0) {
    const { error: paymentsError } = await client.from('payments').insert(paymentsPayload);
    if (paymentsError) {
      throw paymentsError;
    }
  }

  const data = await fetchOrderRows();

  const created = ((data as unknown as DbOrderRow[]) ?? []).find(
    (order) => order.id === orderRow.id
  );
  if (!created) {
    throw new Error('Order tersimpan, tapi gagal memuat ulang data order.');
  }

  return hydrateOrderWithPayload(mapDbOrder(created), payload);
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
  if (isApiConfigured) {
    await apiRequest(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: await getRestaurantHeaders(),
      body: JSON.stringify({ status }),
    });
    return;
  }

  const client = assertSupabase();
  const { error } = await client.from('orders').update({ status }).eq('id', orderId);
  if (error) throw error;
};

export const subscribeOrdersRealtime = (
  onChange: () => Promise<void> | void
): RealtimeChannel | null => {
  if (!hasOrderRealtimeSync || !supabase) return null;

  return supabase
    .channel('orders-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      () => onChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'order_items' },
      () => onChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payments' },
      () => onChange()
    )
    .subscribe();
};

export const createDefaultPayments = (total: number): PaymentLine[] => [
  { id: `cash-${Date.now()}`, method: 'cash', amount: total },
];
