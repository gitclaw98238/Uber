import { apiClient, unwrapData, unwrapList } from './client';
import { Booking, BookingStatus } from '../types';

export interface BookingFilters {
  status?: BookingStatus | 'all';
  scope?: 'customer' | 'provider' | 'admin';
  categoryId?: string;
}

export interface CreateBookingInput {
  categoryId: string;
  address: Booking['address'];
  location?: Booking['location'];
  answers: Record<string, unknown>;
  urgency: Booking['urgency'];
  estimate: number;
  notes?: string;
  scheduledFor?: string;
}

export const bookingsApi = {
  list: async (params?: BookingFilters) => unwrapList<Booking>((await apiClient.get('/bookings', { params })).data),
  get: async (id: string) => unwrapData<Booking>((await apiClient.get(`/bookings/${id}`)).data),
  create: async (payload: CreateBookingInput) => unwrapData<Booking>((await apiClient.post('/bookings', payload)).data),
  updateStatus: async (id: string, status: BookingStatus) =>
    unwrapData<Booking>((await apiClient.patch(`/bookings/${id}/status`, { status })).data),
};
