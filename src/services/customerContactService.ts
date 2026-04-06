import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedCustomerContact } from '../types';

const CUSTOMER_CONTACTS_KEY = 'restopos:customer-contacts';

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '').trim();

export const getSavedCustomerContacts = async (): Promise<SavedCustomerContact[]> => {
  const raw = await AsyncStorage.getItem(CUSTOMER_CONTACTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SavedCustomerContact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCustomerContact = async (input: {
  name: string;
  phone: string;
}): Promise<SavedCustomerContact[]> => {
  const name = input.name.trim();
  const phone = normalizePhone(input.phone);

  if (!name || !phone) {
    return getSavedCustomerContacts();
  }

  const existing = await getSavedCustomerContacts();
  const now = new Date().toISOString();
  const nextContact: SavedCustomerContact = {
    id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    phone,
    updatedAt: now,
  };

  const merged = [
    nextContact,
    ...existing.filter(
      (contact) =>
        normalizePhone(contact.phone) !== phone && contact.name.trim().toLowerCase() !== name.toLowerCase()
    ),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  await AsyncStorage.setItem(CUSTOMER_CONTACTS_KEY, JSON.stringify(merged));
  return merged;
};

