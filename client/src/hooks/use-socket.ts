"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/notification-store";
import { useAuthStore } from "@/store/auth-store";

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/v1$/, "");

let globalSocket: Socket | null = null;

export function getSocket(): Socket | null {
  return globalSocket;
}

export function useSocket() {
  const tokens = useAuthStore((s) => s.tokens);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const syncRead = useNotificationStore((s) => s.syncRead);
  const syncAllRead = useNotificationStore((s) => s.syncAllRead);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !tokens?.access?.token) {
      // Disconnect if logged out
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
        connectedRef.current = false;
      }
      return;
    }

    // Already connected with same token
    if (globalSocket?.connected && connectedRef.current) return;

    // Clean up old connection
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: tokens.access.token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    globalSocket = socket;

    socket.on("connect", () => {
      connectedRef.current = true;
      // Fetch initial notifications on connect
      fetchNotifications();
    });

    socket.on("authenticated", () => {
      // Successfully authenticated
    });

    // Real-time notification push
    socket.on("notification", (data) => {
      addNotification({
        id: data.id,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: false,
        metadata: data.metadata,
        createdAt: data.timestamp || new Date().toISOString(),
      });

      // Show toast for real-time notifications
      toast(data.title, {
        description: data.message,
        duration: 5000,
      });
    });

    // Cross-tab sync
    socket.on("notification:read", (data: { notificationId: string }) => {
      syncRead(data.notificationId);
    });

    socket.on("notification:all-read", () => {
      syncAllRead();
    });

    // Connection update (for dashboard widgets)
    socket.on("connection:update", () => {
      // Components can listen to this via getSocket()
    });

    socket.on("disconnect", () => {
      connectedRef.current = false;
    });

    socket.on("connect_error", async (error) => {
      connectedRef.current = false;
      // If auth error, try to refresh token and reconnect
      if (error.message?.includes("auth") || error.message?.includes("token")) {
        try {
          const stored = localStorage.getItem("tokens");
          if (stored) {
            const { refresh } = JSON.parse(stored);
            const { default: axios } = await import("axios");
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/v1";
            const { data } = await axios.post(`${apiUrl}/auth/refresh-tokens`, {
              refreshToken: refresh.token,
            });
            localStorage.setItem("tokens", JSON.stringify(data.data.tokens));
            socket.auth = { token: data.data.tokens.access.token };
            socket.connect();
          }
        } catch {
          // Refresh failed — user will be redirected by API interceptor on next request
        }
      }
    });

    return () => {
      socket.disconnect();
      globalSocket = null;
      connectedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, tokens?.access?.token]);
}
