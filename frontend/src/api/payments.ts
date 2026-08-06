import { apiClient, unwrapData, unwrapList } from './client';
import { Payment } from '../types';

export const paymentsApi = {
  listMethods: async () => unwrapList<Payment>((await apiClient.get('/payments/methods')).data),
  addMethod: async (payload: Partial<Payment>) => unwrapData<Payment>((await apiClient.post('/payments/methods', payload)).data),
  removeMethod: async (id: string) => unwrapData<{ success: boolean }>((await apiClient.delete(`/payments/methods/${id}`)).data),
  listPayments: async () => unwrapList<Payment>((await apiClient.get('/payments')).data),
};
