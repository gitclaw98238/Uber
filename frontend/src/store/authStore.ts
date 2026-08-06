import { create } from 'zustand';
import { authApi, LoginInput, RegisterInput } from '../api/auth';
import { User } from '../types';
import { getErrorMessage } from '../utils/errors';
import { clearAuthStorage, getStoredToken, getStoredUser, persistAuth } from '../utils/storage';

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  hydrateFromStorage: () => Promise<void>;
  login: (payload: LoginInput) => Promise<User>;
  register: (payload: RegisterInput) => Promise<User>;
  logout: () => void;
  updateProfile: (payload: Partial<User>) => Promise<User>;
  setAuth: (user: User, token: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  token: getStoredToken(),
  isLoading: false,
  isReady: false,
  error: null,
  hydrateFromStorage: async () => {
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      set({ user: storedUser, token, isReady: true });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const user = await authApi.me();
      persistAuth(token, user);
      set({ user, token, isLoading: false, isReady: true });
    } catch (error) {
      clearAuthStorage();
      set({ user: null, token: null, isLoading: false, isReady: true, error: getErrorMessage(error) });
    }
  },
  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(payload);
      persistAuth(response.token, response.user);
      set({ user: response.user, token: response.token, isLoading: false, error: null });
      return response.user;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to sign in.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(payload);
      persistAuth(response.token, response.user);
      set({ user: response.user, token: response.token, isLoading: false, error: null });
      return response.user;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to create your account.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  logout: () => {
    clearAuthStorage();
    set({ user: null, token: null, error: null });
  },
  updateProfile: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authApi.updateProfile(payload);
      const token = get().token;
      if (token) {
        persistAuth(token, user);
      }
      set({ user, isLoading: false });
      return user;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to save your profile.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  setAuth: (user, token) => {
    persistAuth(token, user);
    set({ user, token });
  },
}));
