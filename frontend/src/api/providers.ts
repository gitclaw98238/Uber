import { apiClient, unwrapData, unwrapList } from './client';
import { Provider, ProviderProfile } from '../types';

export interface ProviderFilters {
  search?: string;
  available?: boolean;
  categoryId?: string;
}

export const providersApi = {
  list: async (params?: ProviderFilters) => unwrapList<Provider>((await apiClient.get('/providers', { params })).data),
  get: async (id: string) => unwrapData<Provider>((await apiClient.get(`/providers/${id}`)).data),
  getMine: async () => unwrapData<ProviderProfile>((await apiClient.get('/providers/me')).data),
  updateMine: async (payload: Partial<ProviderProfile>) =>
    unwrapData<ProviderProfile>((await apiClient.patch('/providers/me', payload)).data),
  toggleOnline: async (isOnline: boolean) =>
    unwrapData<ProviderProfile>((await apiClient.patch('/providers/me/availability', { isOnline })).data),
  updateSchedule: async (availability: ProviderProfile['availability']) =>
    unwrapData<ProviderProfile>((await apiClient.patch('/providers/me/schedule', { availability })).data),
  updatePortfolio: async (portfolio: string[]) =>
    unwrapData<ProviderProfile>((await apiClient.patch('/providers/me/portfolio', { portfolio })).data),
};
