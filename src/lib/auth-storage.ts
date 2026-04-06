import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTH_USER_STORAGE_KEY = 'restopos.auth.user';
export const AUTH_TOKEN_STORAGE_KEY = 'restopos.auth.token';

export const getStoredAuthToken = async (): Promise<string | null> =>
  AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

export const saveAuthSession = async (userJson: string, accessToken: string) => {
  await AsyncStorage.multiSet([
    [AUTH_USER_STORAGE_KEY, userJson],
    [AUTH_TOKEN_STORAGE_KEY, accessToken],
  ]);
};

export const clearAuthSession = async () => {
  await AsyncStorage.multiRemove([AUTH_USER_STORAGE_KEY, AUTH_TOKEN_STORAGE_KEY]);
};
