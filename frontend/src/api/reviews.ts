import { apiClient, unwrapData, unwrapList } from './client';
import { Review } from '../types';

export const reviewsApi = {
  listProviderReviews: async (providerId: string) => unwrapList<Review>((await apiClient.get(`/reviews/providers/${providerId}`)).data),
  createReview: async (bookingId: string, payload: Pick<Review, 'rating' | 'comment'>) =>
    unwrapData<Review>((await apiClient.post(`/reviews/bookings/${bookingId}`, payload)).data),
};
