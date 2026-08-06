import { apiClient, unwrapData, unwrapList } from './client';
import { Notification } from '../types';

export const notificationsApi = {
  list: async () => unwrapList<Notification>((await apiClient.get('/notifications')).data),
  markRead: async (id: string) => unwrapData<Notification>((await apiClient.patch(`/notifications/${id}/read`)).data),
  markAllRead: async () => unwrapData<{ success: boolean }>((await apiClient.post('/notifications/read-all')).data),
};
