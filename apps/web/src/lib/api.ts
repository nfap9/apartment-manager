import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '../stores/auth';
import type { AuthRefreshResponse } from './apiTypes';

export const api = axios.create({
  baseURL: '',
  withCredentials: true,
});

let refreshPromise: Promise<string> | null = null;

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetriableRequestConfig | undefined;

    if (status === 401 && original && !original._retry) {
      original._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post<AuthRefreshResponse>('/api/auth/refresh', {}, { withCredentials: true })
            .then((r) => r.data.accessToken)
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;
        useAuthStore.getState().setAccessToken(newToken);

        original.headers = original.headers ?? {};
        (original.headers as unknown as Record<string, string>).Authorization = `Bearer ${newToken}`;

        return api(original);
      } catch {
        useAuthStore.getState().clear();
      }
    }

    throw error;
  },
);

