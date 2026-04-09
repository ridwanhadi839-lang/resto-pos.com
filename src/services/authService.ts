import { apiRequest, isApiConfigured } from '../lib/api';
import {
  clearAuthSession,
  getStoredAuthToken,
  getStoredAuthUserJson,
  saveAuthSession,
} from '../lib/auth-storage';
import { User } from '../types';

const ENABLE_LOCAL_DEV_AUTH =
  __DEV__ && process.env.EXPO_PUBLIC_ENABLE_LOCAL_DEV_AUTH === 'true';
const LOCAL_DEV_LOGIN_PIN = process.env.EXPO_PUBLIC_LOCAL_LOGIN_PIN?.trim() ?? '';

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
    getStoredAuthUserJson(),
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

  if (!ENABLE_LOCAL_DEV_AUTH) {
    return {
      ok: false as const,
      error: 'Backend API belum dikonfigurasi dan login lokal dev sedang nonaktif.',
    };
  }

  if (!isValidPinFormat(LOCAL_DEV_LOGIN_PIN)) {
    return {
      ok: false as const,
      error: 'EXPO_PUBLIC_LOCAL_LOGIN_PIN belum valid. Isi 6 digit untuk dev auth lokal.',
    };
  }

  if (pin !== LOCAL_DEV_LOGIN_PIN) {
    return { ok: false as const, error: 'PIN salah untuk login lokal development.' };
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
