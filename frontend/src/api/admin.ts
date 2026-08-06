import { apiClient, unwrapData, unwrapList } from './client';
import { AdminDashboardData, Booking, Dispute, Provider, ServiceCategory, User } from '../types';

export const adminApi = {
  getDashboard: async () => unwrapData<AdminDashboardData>((await apiClient.get('/admin/dashboard')).data),
  getUsers: async (params?: { search?: string; role?: string }) => unwrapList<User>((await apiClient.get('/admin/users', { params })).data),
  getProviders: async (params?: { search?: string; status?: string }) =>
    unwrapList<Provider>((await apiClient.get('/admin/providers', { params })).data),
  verifyProvider: async (providerId: string, status: 'verified' | 'rejected') =>
    unwrapData<Provider>((await apiClient.patch(`/admin/providers/${providerId}/verification`, { status })).data),
  getBookings: async (params?: { status?: string }) => unwrapList<Booking>((await apiClient.get('/admin/bookings', { params })).data),
  getDisputes: async () => unwrapList<Dispute>((await apiClient.get('/admin/disputes')).data),
  resolveDispute: async (id: string, payload: { status: string; resolution: string }) =>
    unwrapData<Dispute>((await apiClient.patch(`/admin/disputes/${id}`, payload)).data),
  getCategories: async () => unwrapList<ServiceCategory>((await apiClient.get('/admin/categories')).data),
  createCategory: async (payload: Partial<ServiceCategory>) =>
    unwrapData<ServiceCategory>((await apiClient.post('/admin/categories', payload)).data),
  updateCategory: async (id: string, payload: Partial<ServiceCategory>) =>
    unwrapData<ServiceCategory>((await apiClient.patch(`/admin/categories/${id}`, payload)).data),
  deleteCategory: async (id: string) => unwrapData<{ success: boolean }>((await apiClient.delete(`/admin/categories/${id}`)).data),
  getSettings: async () => unwrapData<Record<string, string | number | boolean>>((await apiClient.get('/admin/settings')).data),
  updateSettings: async (payload: Record<string, string | number | boolean>) =>
    unwrapData<Record<string, string | number | boolean>>((await apiClient.patch('/admin/settings', payload)).data),
};
