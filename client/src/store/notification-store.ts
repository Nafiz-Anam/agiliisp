import { create } from "zustand";
import api from "@/lib/api";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  page: number;

  fetchNotifications: () => Promise<void>;
  fetchMore: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  setUnreadCount: (count: number) => void;
  syncRead: (notificationId: string) => void;
  syncAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: true,
  page: 1,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get("/me/notifications", {
        params: { page: 1, limit: 20 },
      });
      const result = data.data;
      set({
        notifications: result.notifications,
        unreadCount: result.unread,
        hasMore: result.notifications.length < result.total,
        page: 1,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchMore: async () => {
    const { page, hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;
    set({ isLoading: true });
    try {
      const nextPage = page + 1;
      const { data } = await api.get("/me/notifications", {
        params: { page: nextPage, limit: 20 },
      });
      const result = data.data;
      set((state) => ({
        notifications: [...state.notifications, ...result.notifications],
        hasMore: state.notifications.length + result.notifications.length < result.total,
        page: nextPage,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: async (id) => {
    try {
      await api.patch(`/me/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {}
  },

  markAllAsRead: async () => {
    try {
      await api.patch("/me/notifications/read-all");
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {}
  },

  deleteNotification: async (id) => {
    try {
      await api.delete(`/me/notifications/${id}`);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    } catch {}
  },

  setUnreadCount: (count) => set({ unreadCount: count }),

  // Cross-tab sync helpers (called from socket events)
  syncRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  syncAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
}));
