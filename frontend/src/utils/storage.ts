import { User } from '../types';

export const TOKEN_STORAGE_KEY = 'uber-services-token';
export const USER_STORAGE_KEY = 'uber-services-user';

export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_STORAGE_KEY);

export const getStoredUser = (): User | null => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const persistAuth = (token: string, user: User) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearAuthStorage = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};
