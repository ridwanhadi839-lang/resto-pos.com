import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, isApiConfigured } from '../lib/api';
import { getCurrentRestaurantCode } from './authService';
import { SavedCustomerContact } from '../types';

const CUSTOMER_CONTACTS_KEY = 'restopos:customer-contacts';

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '').trim();
const sortContacts = (contacts: SavedCustomerContact[]) =>
  [...contacts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

const getRestaurantHeaders = async () => {
  const restaurantCode = await getCurrentRestaurantCode();

  if (!restaurantCode) {
    throw new Error('Kode restoran belum tersedia. Silakan login ulang.');
  }

  return {
    'x-restaurant-code': restaurantCode,
  };
};

export const getSavedCustomerContacts = async (): Promise<SavedCustomerContact[]> => {
  if (isApiConfigured) {
    const response = await apiRequest<SavedCustomerContact[]>('/api/customer-contacts', {
      headers: await getRestaurantHeaders(),
    });

    return response.data ?? [];
  }

  const raw = await AsyncStorage.getItem(CUSTOMER_CONTACTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SavedCustomerContact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const upsertCustomerContact = async (input: {
  id?: string;
  name: string;
  phone: string;
}): Promise<SavedCustomerContact[]> => {
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);

  if (!name || !phone) {
    return getSavedCustomerContacts();
  }

  if (isApiConfigured) {
    const response = await apiRequest<SavedCustomerContact[]>('/api/customer-contacts', {
      method: 'POST',
      headers: await getRestaurantHeaders(),
      body: JSON.stringify({ name, phone }),
    });

    return response.data ?? [];
  }

  const existing = await getSavedCustomerContacts();
  const now = new Date().toISOString();
  const nextContact: SavedCustomerContact = {
    id: input.id ?? `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    phone,
    updatedAt: now,
  };

  const merged = sortContacts([
    nextContact,
    ...existing.filter(
      (contact) =>
        contact.id !== input.id &&
        normalizePhone(contact.phone) !== phone &&
        contact.name.trim().toLowerCase() !== name.toLowerCase()
    ),
  ]);

  await AsyncStorage.setItem(CUSTOMER_CONTACTS_KEY, JSON.stringify(merged));
  return merged;
};

export const saveCustomerContact = async (input: {
  name: string;
  phone: string;
}): Promise<SavedCustomerContact[]> => upsertCustomerContact(input);

export const deleteCustomerContact = async (id: string): Promise<SavedCustomerContact[]> => {
  if (isApiConfigured) {
    const response = await apiRequest<SavedCustomerContact[]>(`/api/customer-contacts/${id}`, {
      method: 'DELETE',
      headers: await getRestaurantHeaders(),
    });

    return response.data ?? [];
  }

  const existing = await getSavedCustomerContacts();
  const filtered = existing.filter((contact) => contact.id !== id);
  await AsyncStorage.setItem(CUSTOMER_CONTACTS_KEY, JSON.stringify(filtered));
  return filtered;
};
