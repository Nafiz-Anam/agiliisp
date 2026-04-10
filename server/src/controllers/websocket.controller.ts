import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import prisma from '../client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

class SocketController {
  private io: Server;

  constructor(httpServer: HttpServer) {
    const allowedOrigins = config.clientUrl
      ? [config.clientUrl, config.clientUrl.replace('https://', 'http://'), 'http://localhost:3001', 'http://localhost:3000']
      : ['http://localhost:3001', 'http://localhost:3000'];

    this.io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
      },
      path: '/socket.io',
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    console.log('Socket.io server initialized (attached to HTTP server)');
  }

  /**
   * JWT authentication middleware — runs before connection is established
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      try {
        const decoded = jwt.verify(token as string, config.jwt.secret) as any;
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, role: true },
        });
        if (!user) {
          return next(new Error('User not found'));
        }
        socket.userId = user.id;
        socket.userRole = user.role;
        next();
      } catch {
        next(new Error('Invalid authentication token'));
      }
    });
  }

  /**
   * Setup connection and event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const { userId, userRole } = socket;
      if (!userId || !userRole) return socket.disconnect();

      // Join personal room and role room
      socket.join(`user:${userId}`);
      socket.join(`role:${userRole}`);

      console.log(`User ${userId} (${userRole}) connected via Socket.io`);

      socket.emit('authenticated', { userId, role: userRole });

      // Handle mark notification as read
      socket.on('mark_notification_read', async (data: { notificationId: string }) => {
        try {
          const notifModule = await import('../services/notification.service');
          await notifModule.default.markAsRead(userId, data.notificationId);
          // Sync across user's other tabs/devices
          socket.to(`user:${userId}`).emit('notification:read', { notificationId: data.notificationId });
          socket.emit('notification:read:success', { notificationId: data.notificationId });
        } catch (error) {
          socket.emit('error', { message: 'Failed to mark notification as read' });
        }
      });

      // Handle mark all notifications as read
      socket.on('mark_all_notifications_read', async () => {
        try {
          const notifModule = await import('../services/notification.service');
          const count = await notifModule.default.markAllAsRead(userId);
          socket.to(`user:${userId}`).emit('notification:all-read', { count });
          socket.emit('notification:all-read:success', { count });
        } catch (error) {
          socket.emit('error', { message: 'Failed to mark all notifications as read' });
        }
      });

      // Ping/pong
      socket.on('ping', () => socket.emit('pong'));

      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected from Socket.io`);
      });
    });
  }

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Send notification to a specific user (all their connected tabs/devices)
   */
  emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Send notification to all users with a specific role
   */
  emitToRole(role: string, event: string, data: any): void {
    this.io.to(`role:${role}`).emit(event, data);
  }

  /**
   * Send notification to multiple roles
   */
  emitToRoles(roles: string[], event: string, data: any): void {
    for (const role of roles) {
      this.io.to(`role:${role}`).emit(event, data);
    }
  }

  /**
   * Broadcast to all connected users
   */
  emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  /**
   * Send push notification to a specific user (convenience wrapper)
   */
  async sendPushNotification(
    userId: string,
    notification: { type: string; title: string; message: string; metadata?: any }
  ): Promise<void> {
    this.emitToUser(userId, 'notification', {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
      timestamp: new Date(),
      isRead: false,
    });
  }

  /**
   * Broadcast notification to all connected users
   */
  async broadcastNotification(notification: {
    type: string;
    title: string;
    message: string;
    metadata?: any;
  }): Promise<void> {
    this.emitToAll('notification', {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
      timestamp: new Date(),
      isRead: false,
    });
  }

  /**
   * Get count of connected users
   */
  getConnectedUsersCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get count of a specific user's active connections
   */
  getUserConnections(userId: string): number {
    const room = this.io.sockets.adapter.rooms.get(`user:${userId}`);
    return room?.size || 0;
  }

  /**
   * Get the underlying Socket.io server instance
   */
  getServer(): Server {
    return this.io;
  }
}

// ─── Singleton ──────────────────────────────────────────────────

let socketController: SocketController | null = null;

/**
 * Initialize Socket.io controller (call once after HTTP server is created)
 */
export const initializeSocket = (httpServer: HttpServer): SocketController => {
  if (!socketController) {
    socketController = new SocketController(httpServer);
  }
  return socketController;
};

/**
 * Get Socket.io controller instance
 */
export const getSocketController = (): SocketController => {
  if (!socketController) {
    throw new Error('Socket controller not initialized. Call initializeSocket(httpServer) first.');
  }
  return socketController;
};

// Backwards-compatible aliases for existing code
export const initializeWebSocket = () => {
  console.warn('initializeWebSocket() is deprecated — use initializeSocket(httpServer) instead');
};
export const getWebSocketController = getSocketController;

export default SocketController;
