import { create } from 'zustand';
import { Provider, ProviderProfile } from '../types';
import { getErrorMessage } from '../utils/errors';
import { providersApi, ProviderFilters } from '../api/providers';

interface ProviderState {
  providers: Provider[];
  providerProfile: ProviderProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchProviders: (filters?: ProviderFilters) => Promise<Provider[]>;
  fetchProviderProfile: (id: string) => Promise<Provider>;
  fetchMyProviderProfile: () => Promise<ProviderProfile>;
  updateMyProviderProfile: (payload: Partial<ProviderProfile>) => Promise<ProviderProfile>;
  toggleOnline: (isOnline: boolean) => Promise<ProviderProfile>;
}

export const useProviderStore = create<ProviderState>((set) => ({
  providers: [],
  providerProfile: null,
  isLoading: false,
  error: null,
  fetchProviders: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const providers = await providersApi.list(filters);
      set({ providers, isLoading: false });
      return providers;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load providers.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  fetchProviderProfile: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const provider = await providersApi.get(id);
      set({ isLoading: false });
      return provider;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load provider profile.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  fetchMyProviderProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const providerProfile = await providersApi.getMine();
      set({ providerProfile, isLoading: false });
      return providerProfile;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load your provider profile.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  updateMyProviderProfile: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const providerProfile = await providersApi.updateMine(payload);
      set({ providerProfile, isLoading: false });
      return providerProfile;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to save your provider profile.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  toggleOnline: async (isOnline) => {
    set({ isLoading: true, error: null });
    try {
      const providerProfile = await providersApi.toggleOnline(isOnline);
      set({ providerProfile, isLoading: false });
      return providerProfile;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to change your status.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
}));
