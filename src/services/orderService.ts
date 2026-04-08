import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CATEGORIES, PRODUCTS } from '../data/mockData';
import { apiRequest, isApiConfigured } from '../lib/api';
import { getCurrentRestaurantCode } from './authService';
import {
  Category,
  CreateOrderInput,
  Order,
  OrderStatus,
  PaymentLine,
  Product,
} from '../types';

type CatalogData = {
  categories: Category[];
  products: Product[];
};

type StoredCatalogData = CatalogData & {
  savedAt: string;
};

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

export const hasRemoteOrderAccess = isApiConfigured;
export const hasRemoteCatalogAccess = isApiConfigured;
export const hasOrderRealtimeSync = false;

const CATALOG_CACHE_STORAGE_KEY_PREFIX = 'restopos.catalog.';
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const catalogMemoryCache = new Map<
  string,
  {
    data: CatalogData;
    savedAt: string;
    expiresAt: number;
  }
>();
const catalogInflightRequests = new Map<string, Promise<CatalogData>>();

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

const cloneCatalogData = (catalog: CatalogData): CatalogData => ({
  categories: catalog.categories.map((category) => ({ ...category })),
  products: catalog.products.map((product) => ({ ...product })),
});

const getCatalogStorageKey = (restaurantCode: string) =>
  `${CATALOG_CACHE_STORAGE_KEY_PREFIX}${restaurantCode}`;

const setCatalogMemoryCache = (restaurantCode: string, catalog: CatalogData, savedAt: string) => {
  catalogMemoryCache.set(restaurantCode, {
    data: cloneCatalogData(catalog),
    savedAt,
    expiresAt: new Date(savedAt).getTime() + CATALOG_CACHE_TTL_MS,
  });
};

const getCatalogFromMemoryCache = (restaurantCode: string, allowStale: boolean) => {
  const entry = catalogMemoryCache.get(restaurantCode);
  if (!entry) return null;

  if (!allowStale && Date.now() > entry.expiresAt) {
    catalogMemoryCache.delete(restaurantCode);
    return null;
  }

  return cloneCatalogData(entry.data);
};

const persistCatalogCache = async (restaurantCode: string, catalog: CatalogData) => {
  const savedAt = new Date().toISOString();
  const payload: StoredCatalogData = {
    ...cloneCatalogData(catalog),
    savedAt,
  };

  setCatalogMemoryCache(restaurantCode, payload, savedAt);
  await AsyncStorage.setItem(getCatalogStorageKey(restaurantCode), JSON.stringify(payload));
};

const readCatalogCache = async (
  restaurantCode: string,
  { allowStale = true }: { allowStale?: boolean } = {}
): Promise<CatalogData | null> => {
  const memoryCached = getCatalogFromMemoryCache(restaurantCode, allowStale);
  if (memoryCached) {
    return memoryCached;
  }

  const raw = await AsyncStorage.getItem(getCatalogStorageKey(restaurantCode));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredCatalogData>;
    const savedAt = typeof parsed.savedAt === 'string' ? parsed.savedAt : null;
    if (!savedAt) {
      await AsyncStorage.removeItem(getCatalogStorageKey(restaurantCode));
      return null;
    }

    const expiresAt = new Date(savedAt).getTime() + CATALOG_CACHE_TTL_MS;
    if (!allowStale && Date.now() > expiresAt) {
      await AsyncStorage.removeItem(getCatalogStorageKey(restaurantCode));
      return null;
    }

    const catalog: CatalogData = {
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
    };

    setCatalogMemoryCache(restaurantCode, catalog, savedAt);
    return cloneCatalogData(catalog);
  } catch {
    await AsyncStorage.removeItem(getCatalogStorageKey(restaurantCode));
    return null;
  }
};

const invalidateCatalogCacheByRestaurantCode = async (restaurantCode: string | null) => {
  if (!restaurantCode) return;

  catalogMemoryCache.delete(restaurantCode);
  await AsyncStorage.removeItem(getCatalogStorageKey(restaurantCode));
};

const invalidateCurrentCatalogCache = async () => {
  if (!hasRemoteCatalogAccess) return;

  const restaurantCode = await getCurrentRestaurantCode();
  await invalidateCatalogCacheByRestaurantCode(restaurantCode);
};

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

const requireRestaurantCodeForCatalog = async (restaurantCodeOverride?: string | null) => {
  const restaurantCode = restaurantCodeOverride ?? (await getCurrentRestaurantCode());

  if (!restaurantCode) {
    throw new Error('Kode restoran belum tersedia. Silakan login ulang.');
  }

  return restaurantCode;
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


const fetchCatalogFromSource = async (): Promise<CatalogData> => {
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

  return { categories: CATEGORIES, products: PRODUCTS };
};

const fetchFreshCatalog = async (restaurantCode: string) => {
  const existingRequest = catalogInflightRequests.get(restaurantCode);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const catalog = await fetchCatalogFromSource();
    await persistCatalogCache(restaurantCode, catalog);
    return cloneCatalogData(catalog);
  })();

  catalogInflightRequests.set(restaurantCode, request);

  try {
    return await request;
  } finally {
    catalogInflightRequests.delete(restaurantCode);
  }
};

export const getCachedCatalog = async (
  restaurantCodeOverride?: string | null
): Promise<CatalogData | null> => {
  if (!hasRemoteCatalogAccess) {
    return { categories: CATEGORIES, products: PRODUCTS };
  }

  const restaurantCode = await requireRestaurantCodeForCatalog(restaurantCodeOverride);
  return readCatalogCache(restaurantCode, { allowStale: true });
};

export const preloadCatalog = async ({
  forceRefresh = false,
  restaurantCode,
}: {
  forceRefresh?: boolean;
  restaurantCode?: string | null;
} = {}): Promise<CatalogData> => {
  if (!hasRemoteCatalogAccess) {
    return { categories: CATEGORIES, products: PRODUCTS };
  }

  const resolvedRestaurantCode = await requireRestaurantCodeForCatalog(restaurantCode);

  if (!forceRefresh) {
    const cached = await readCatalogCache(resolvedRestaurantCode, { allowStale: false });
    if (cached) {
      return cached;
    }
  }

  return fetchFreshCatalog(resolvedRestaurantCode);
};

export const fetchCatalog = async (restaurantCode?: string | null): Promise<CatalogData> =>
  preloadCatalog({ restaurantCode });

export const createCategory = async (name: string): Promise<Category> => {
  if (isApiConfigured) {
    const response = await apiRequest<Category>('/api/catalog/categories', {
      method: 'POST',
      headers: await getRestaurantHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!response.data) throw new Error('Backend tidak mengembalikan kategori baru.');
    await invalidateCurrentCatalogCache();
    return response.data;
  }

  throw new Error('CRUD katalog hanya tersedia lewat backend Express.');
};

export const updateCategory = async (id: string, name: string): Promise<Category> => {
  if (isApiConfigured) {
    const response = await apiRequest<Category>(`/api/catalog/categories/${id}`, {
      method: 'PATCH',
      headers: await getRestaurantHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!response.data) throw new Error('Backend tidak mengembalikan kategori hasil update.');
    await invalidateCurrentCatalogCache();
    return response.data;
  }

  throw new Error('CRUD katalog hanya tersedia lewat backend Express.');
};

export const deleteCategory = async (id: string): Promise<void> => {
  if (isApiConfigured) {
    await apiRequest(`/api/catalog/categories/${id}`, {
      method: 'DELETE',
      headers: await getRestaurantHeaders(),
    });
    await invalidateCurrentCatalogCache();
    return;
  }

  throw new Error('CRUD katalog hanya tersedia lewat backend Express.');
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
    await invalidateCurrentCatalogCache();
    return response.data;
  }

  throw new Error('CRUD katalog hanya tersedia lewat backend Express.');
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
    await invalidateCurrentCatalogCache();
    return response.data;
  }

  throw new Error('CRUD katalog hanya tersedia lewat backend Express.');
};

export const deleteProduct = async (id: string): Promise<void> => {
  if (isApiConfigured) {
    await apiRequest(`/api/catalog/products/${id}`, {
      method: 'DELETE',
      headers: await getRestaurantHeaders(),
    });
    await invalidateCurrentCatalogCache();
    return;
  }

  throw new Error('CRUD katalog hanya tersedia lewat backend Express.');
};

export const fetchOrders = async (): Promise<Order[]> => {
  if (isApiConfigured) {
    const response = await apiRequest<Order[]>('/api/orders', {
      headers: await getRestaurantHeaders(),
    });
    return response.data ?? [];
  }

  return [];
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

  throw new Error('Pembuatan order hanya tersedia lewat backend Express.');
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

  throw new Error('Update status order hanya tersedia lewat backend Express.');
};

export const subscribeOrdersRealtime = (
  onChange: () => Promise<void> | void
): RealtimeChannel | null => {
  void onChange;
  return null;
};

export const createDefaultPayments = (total: number): PaymentLine[] => [
  { id: `cash-${Date.now()}`, method: 'cash', amount: total },
];
