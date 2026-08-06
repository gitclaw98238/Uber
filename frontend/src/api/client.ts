import axios from 'axios';
import { clearAuthStorage, getStoredToken } from '../utils/storage';

export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      clearAuthStorage();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

export const unwrapData = <T,>(payload: unknown): T => {
  if (payload && typeof payload === 'object') {
    const candidate = payload as { data?: T; item?: T; result?: T };
    if (candidate.data !== undefined) return candidate.data;
    if (candidate.item !== undefined) return candidate.item;
    if (candidate.result !== undefined) return candidate.result;
  }

  return payload as T;
};

export const unwrapList = <T,>(payload: unknown): T[] => {
  const value = unwrapData<unknown>(payload);

  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === 'object') {
    const record = value as { items?: T[]; results?: T[] };
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.results)) return record.results;
  }

  return [];
};
