import { apiClient, unwrapData, unwrapList } from './client';
import { ServiceCategory } from '../types';

export const categoriesApi = {
  list: async () => unwrapList<ServiceCategory>((await apiClient.get('/categories')).data),
  get: async (id: string) => unwrapData<ServiceCategory>((await apiClient.get(`/categories/${id}`)).data),
};
