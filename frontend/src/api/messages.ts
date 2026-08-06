import { apiClient, unwrapData, unwrapList } from './client';
import { ConversationSummary, Message } from '../types';

const normalizeMessages = (payload: unknown) => {
  const value = unwrapData<Message | Message[]>(payload);
  return Array.isArray(value) ? value : [value];
};

export const messagesApi = {
  listConversations: async () => unwrapList<ConversationSummary>((await apiClient.get('/messages')).data),
  getBookingMessages: async (bookingId: string) =>
    unwrapList<Message>((await apiClient.get(`/messages/bookings/${bookingId}`)).data),
  sendMessage: async (bookingId: string, content: string) =>
    normalizeMessages((await apiClient.post(`/messages/bookings/${bookingId}`, { content })).data),
};
