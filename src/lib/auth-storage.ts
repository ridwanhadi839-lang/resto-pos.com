import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTH_USER_STORAGE_KEY = 'restopos.auth.user';
export const AUTH_TOKEN_STORAGE_KEY = 'restopos.auth.token';

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

let cachedUserJson: string | null = null;
let cachedAccessToken: string | null = null;
let hasHydratedUserCache = false;
let hasHydratedTokenCache = false;

const getSecureStore = (): SecureStoreModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-secure-store') as SecureStoreModule;
  } catch {
    return null;
  }
};

const readStoredUserJson = async () => {
  if (hasHydratedUserCache) {
    return cachedUserJson;
  }

  cachedUserJson = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
  hasHydratedUserCache = true;
  return cachedUserJson;
};

const readStoredAccessToken = async () => {
  if (hasHydratedTokenCache) {
    return cachedAccessToken;
  }

  const secureStore = getSecureStore();
  cachedAccessToken = secureStore
    ? await secureStore.getItemAsync(AUTH_TOKEN_STORAGE_KEY)
    : await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  hasHydratedTokenCache = true;
  return cachedAccessToken;
};

export const getStoredAuthUserJson = async (): Promise<string | null> => readStoredUserJson();

export const getStoredAuthToken = async (): Promise<string | null> => readStoredAccessToken();

export const saveAuthSession = async (userJson: string, accessToken: string) => {
  const secureStore = getSecureStore();

  cachedUserJson = userJson;
  cachedAccessToken = accessToken;
  hasHydratedUserCache = true;
  hasHydratedTokenCache = true;

  await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, userJson);
  if (secureStore) {
    await secureStore.setItemAsync(AUTH_TOKEN_STORAGE_KEY, accessToken);
    await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
};

export const clearAuthSession = async () => {
  const secureStore = getSecureStore();

  cachedUserJson = null;
  cachedAccessToken = null;
  hasHydratedUserCache = true;
  hasHydratedTokenCache = true;

  await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
  await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  if (secureStore) {
    await secureStore.deleteItemAsync(AUTH_TOKEN_STORAGE_KEY);
  }
};
