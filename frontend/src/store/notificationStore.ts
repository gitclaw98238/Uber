import { create } from 'zustand';
import { notificationsApi } from '../api/notifications';
import { Notification } from '../types';
import { getErrorMessage } from '../utils/errors';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<Notification[]>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  pushNotification: (notification: Notification) => void;
}

const unreadCountFor = (notifications: Notification[]) => notifications.filter((item) => !item.isRead).length;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const notifications = await notificationsApi.list();
      set({ notifications, unreadCount: unreadCountFor(notifications), isLoading: false });
      return notifications;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to load notifications.');
      set({ isLoading: false, error: message });
      throw error;
    }
  },
  markRead: async (id) => {
    try {
      const updated = await notificationsApi.markRead(id);
      set((state) => {
        const notifications = state.notifications.map((item) => (item.id === id ? updated : item));
        return { notifications, unreadCount: unreadCountFor(notifications) };
      });
    } catch (error) {
      set({ error: getErrorMessage(error, 'Unable to mark notification as read.') });
      throw error;
    }
  },
  markAllRead: async () => {
    try {
      await notificationsApi.markAllRead();
      set((state) => {
        const notifications = state.notifications.map((item) => ({ ...item, isRead: true }));
        return { notifications, unreadCount: 0 };
      });
    } catch (error) {
      set({ error: getErrorMessage(error, 'Unable to mark notifications as read.') });
      throw error;
    }
  },
  pushNotification: (notification) => {
    set((state) => {
      const notifications = [notification, ...state.notifications.filter((item) => item.id !== notification.id)];
      return { notifications, unreadCount: unreadCountFor(notifications) };
    });
  },
}));
