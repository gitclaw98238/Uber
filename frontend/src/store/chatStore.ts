import { create } from 'zustand';
import { messagesApi } from '../api/messages';
import { Message } from '../types';
import { getErrorMessage } from '../utils/errors';

interface ChatState {
  messagesByBooking: Record<string, Message[]>;
  isLoading: boolean;
  error: string | null;
  fetchConversation: (bookingId: string) => Promise<Message[]>;
  sendMessage: (bookingId: string, content: string) => Promise<Message[]>;
  appendMessage: (bookingId: string, message: Message) => void;
  setMessages: (bookingId: string, messages: Message[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messagesByBooking: {},
  isLoading: false,
  error: null,
  fetchConversation: async (bookingId) => {
    set({ isLoading: true, error: null });
    try {
      const messages = await messagesApi.getBookingMessages(bookingId);
      set((state) => ({ messagesByBooking: { ...state.messagesByBooking, [bookingId]: messages }, isLoading: false }));
      return messages;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load messages.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  sendMessage: async (bookingId, content) => {
    set({ isLoading: true, error: null });
    try {
      const messages = await messagesApi.sendMessage(bookingId, content);
      set((state) => ({
        messagesByBooking: {
          ...state.messagesByBooking,
          [bookingId]: [...(state.messagesByBooking[bookingId] || []), ...messages].filter(
            (message, index, list) => list.findIndex((item) => item.id === message.id) === index,
          ),
        },
        isLoading: false,
      }));
      return messages;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to send your message.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  appendMessage: (bookingId, message) => {
    set((state) => ({
      messagesByBooking: {
        ...state.messagesByBooking,
        [bookingId]: [...(state.messagesByBooking[bookingId] || []).filter((item) => item.id !== message.id), message],
      },
    }));
  },
  setMessages: (bookingId, messages) => {
    set((state) => ({ messagesByBooking: { ...state.messagesByBooking, [bookingId]: messages } }));
  },
}));
