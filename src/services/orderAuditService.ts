import { apiRequest, isApiConfigured } from '../lib/api';
import { getCurrentRestaurantCode } from './authService';

type VoidAuditPayload = {
  orderNumber: string;
  reason: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  itemCount: number;
  orderType: string;
  customerName?: string;
  customerPhone?: string;
};

const getAuditHeaders = async () => {
  const restaurantCode = await getCurrentRestaurantCode();

  if (!restaurantCode) {
    throw new Error('Kode restoran belum tersedia. Silakan login ulang.');
  }

  return {
    'x-restaurant-code': restaurantCode,
  };
};

export const recordVoidAuditLog = async (payload: VoidAuditPayload) => {
  if (!isApiConfigured) {
    return null;
  }

  await apiRequest('/api/orders/audit/void', {
    method: 'POST',
    headers: await getAuditHeaders(),
    body: JSON.stringify(payload),
  });

  return true;
};
