import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, isApiConfigured } from '../lib/api';
import {
  AUTH_USER_STORAGE_KEY,
  clearAuthSession,
  getStoredAuthToken,
  saveAuthSession,
} from '../lib/auth-storage';
import { User } from '../types';

export const LOGIN_PIN = '445566';

const DEFAULT_USER: User = {
  id: 'local-cashier',
  name: 'Cashier',
  role: 'cashier',
};

type AuthListener = (user: User | null) => void;

const listeners = new Set<AuthListener>();
const isStaleLocalDevToken = (accessToken: string | null) =>
  isApiConfigured && accessToken === 'local-dev-token';
const buildLocalUser = (restaurantCode: string): User => ({
  ...DEFAULT_USER,
  restaurantCode,
  restaurantName: restaurantCode.toUpperCase(),
});

const notifyAuthListeners = (user: User | null) => {
  listeners.forEach((listener) => listener(user));
};

const isValidPinFormat = (pin: string) => /^[0-9]{6}$/.test(pin);
const normalizeRestaurantCode = (restaurantCode: string) => restaurantCode.trim().toLowerCase();

export const getStoredAuthUser = async (): Promise<User | null> => {
  const [raw, accessToken] = await Promise.all([
    AsyncStorage.getItem(AUTH_USER_STORAGE_KEY),
    getStoredAuthToken(),
  ]);
  if (!raw || !accessToken) return null;

  try {
    if (isStaleLocalDevToken(accessToken)) {
      await clearAuthSession();
      return null;
    }

    return JSON.parse(raw) as User;
  } catch {
    await clearAuthSession();
    return null;
  }
};

export const getCurrentRestaurantCode = async (): Promise<string | null> => {
  const user = await getStoredAuthUser();
  return user?.restaurantCode ?? null;
};

export const signInWithPin = async (restaurantCode: string, pin: string) => {
  const normalizedRestaurantCode = normalizeRestaurantCode(restaurantCode);
  if (!normalizedRestaurantCode) {
    return { ok: false as const, error: 'Kode restoran wajib diisi.' };
  }

  if (!isValidPinFormat(pin)) {
    return { ok: false as const, error: 'PIN harus 6 digit angka.' };
  }

  if (isApiConfigured) {
    try {
      const response = await apiRequest<{ user: User; accessToken: string }>(
        '/api/auth/pin-login',
        {
          method: 'POST',
          body: JSON.stringify({ restaurantCode: normalizedRestaurantCode, pin }),
        }
      );

      const user = response.data?.user;
      const accessToken = response.data?.accessToken;
      if (!user || !accessToken) {
        return { ok: false as const, error: 'Backend tidak mengembalikan sesi login yang lengkap.' };
      }

      await saveAuthSession(JSON.stringify(user), accessToken);
      notifyAuthListeners(user);

      return { ok: true as const, user };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : 'Login ke backend gagal.',
      };
    }
  }

  if (pin !== LOGIN_PIN) {
    return { ok: false as const, error: 'PIN salah. Gunakan PIN yang sudah ditentukan.' };
  }

  const localUser = buildLocalUser(normalizedRestaurantCode);

  await saveAuthSession(JSON.stringify(localUser), 'local-dev-token');
  notifyAuthListeners(localUser);

  return { ok: true as const, user: localUser };
};

export const signOut = async () => {
  await clearAuthSession();
  notifyAuthListeners(null);
};

export const getInitialUser = async (): Promise<User | null> => {
  return getStoredAuthUser();
};

export const onAuthStateChanged = (callback: AuthListener) => {
  listeners.add(callback);
  return {
    unsubscribe: () => listeners.delete(callback),
  };
};
