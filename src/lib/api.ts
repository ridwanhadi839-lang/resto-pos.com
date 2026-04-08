import { getStoredAuthToken } from './auth-storage';

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
};

const API_REQUEST_TIMEOUT_MS = 8000;

const normalizeBaseUrl = (value?: string) => {
  if (!value) return '';
  return value.trim().replace(/\/+$/, '');
};

export const apiBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
export const isApiConfigured = Boolean(apiBaseUrl);

export const apiRequest = async <T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> => {
  if (!isApiConfigured) {
    throw new Error('Backend API belum dikonfigurasi. Isi EXPO_PUBLIC_API_BASE_URL.');
  }

  const headers = new Headers(init?.headers);
  const accessToken = await getStoredAuthToken();
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), API_REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
      signal: abortController.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request ke backend timeout. Cek server Express atau koneksi ke Supabase.');
    }

    throw new Error('Tidak bisa terhubung ke backend. Periksa EXPO_PUBLIC_API_BASE_URL dan server Express.');
  } finally {
    clearTimeout(timeoutId);
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Request ke backend gagal.');
  }

  if (!payload) {
    throw new Error('Backend mengembalikan respons yang tidak valid.');
  }

  return payload;
};
