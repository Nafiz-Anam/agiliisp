import prisma from '../client';
import logger from '../config/logger';
import mikrotikService from './mikrotik.service';
import complianceLogService from './complianceLog.service';
import announcementService from './announcement.service';

interface CachedConnection {
  username: string;
  ipAddress: string;
  macAddress: string;
  uptime: string;
  sessionId: string;
  service: string;
}

// In-memory store: routerId -> Map<username, CachedConnection>
const previousState = new Map<string, Map<string, CachedConnection>>();
let pollInterval: NodeJS.Timeout | null = null;

/**
 * Poll all online routers, compare with previous state, detect connect/disconnect events
 */
const pollAllRouters = async (): Promise<void> => {
  try {
    const routers = await prisma.router.findMany({
      where: { status: 'ONLINE' },
      select: { id: true, name: true, ipAddress: true },
    });

    for (const router of routers) {
      try {
        const connections = await mikrotikService.getActiveConnections(router.id);
        const currentMap = new Map<string, CachedConnection>();

        for (const conn of connections) {
          currentMap.set(conn.name, {
            username: conn.name,
            ipAddress: conn.address || '',
            macAddress: conn.callerId || '',
            uptime: conn.uptime || '',
            sessionId: conn.sessionId || conn['.id'] || '',
            service: conn.service || 'pppoe',
          });
        }

        const prev = previousState.get(router.id) || new Map();

        // Detect NEW connections (in current but not in previous)
        for (const [username, conn] of currentMap) {
          if (!prev.has(username)) {
            const customer = await prisma.ispCustomer.findFirst({
              where: { username },
              select: { id: true },
            });

            complianceLogService.logSession({
              customerId: customer?.id, username, routerId: router.id,
              eventType: 'CONNECT', sessionId: conn.sessionId,
              ipAddress: conn.ipAddress, macAddress: conn.macAddress,
              nasIp: router.ipAddress, service: conn.service,
            }).catch(() => {});

            complianceLogService.logAuth({
              username, customerId: customer?.id, routerId: router.id,
              eventType: 'LOGIN_SUCCESS', ipAddress: conn.ipAddress,
              macAddress: conn.macAddress, nasIp: router.ipAddress, service: conn.service,
            }).catch(() => {});

            if (conn.ipAddress) {
              complianceLogService.logNat({
                customerId: customer?.id, username, assignedIp: conn.ipAddress,
                macAddress: conn.macAddress, routerId: router.id, action: 'ASSIGN',
              }).catch(() => {});
            }

            // Update customer last online
            if (customer?.id) {
              prisma.ispCustomer.update({
                where: { id: customer.id },
                data: { lastOnlineAt: new Date() } as any,
              }).catch(() => {});
            }
          }
        }

        // Detect GONE connections (in previous but not in current)
        for (const [username, conn] of prev) {
          if (!currentMap.has(username)) {
            const customer = await prisma.ispCustomer.findFirst({
              where: { username },
              select: { id: true },
            });

            // Parse uptime to seconds for session duration
            const durationMatch = conn.uptime.match(/(?:(\d+)w)?(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
            let duration: number | undefined;
            if (durationMatch) {
              duration = (parseInt(durationMatch[1] || '0') * 604800) +
                (parseInt(durationMatch[2] || '0') * 86400) +
                (parseInt(durationMatch[3] || '0') * 3600) +
                (parseInt(durationMatch[4] || '0') * 60) +
                (parseInt(durationMatch[5] || '0'));
              if (duration === 0) duration = undefined;
            }

            complianceLogService.logSession({
              customerId: customer?.id, username, routerId: router.id,
              eventType: 'DISCONNECT', sessionId: conn.sessionId,
              ipAddress: conn.ipAddress, macAddress: conn.macAddress,
              nasIp: router.ipAddress, service: conn.service,
              sessionDuration: duration, disconnectReason: 'connection-lost',
            }).catch(() => {});

            if (conn.ipAddress) {
              complianceLogService.logNat({
                customerId: customer?.id, username, assignedIp: conn.ipAddress,
                macAddress: conn.macAddress, routerId: router.id, action: 'RELEASE',
              }).catch(() => {});
            }
          }
        }

        // Update state
        previousState.set(router.id, currentMap);

        // Emit real-time connection summary to admin dashboard
        try {
          const notifModule = await import('./notification.service');
          notifModule.default.notifyConnectionChange({
            online: currentMap.size,
            offline: prev.size > currentMap.size ? prev.size - currentMap.size : 0,
            routerName: router.name || router.id,
          }).catch(() => {});
        } catch {}

      } catch {
        // Router unreachable — trigger outage detection
        announcementService.detectOutage(router.id).catch(() => {});
      }
    }
  } catch (err: any) {
    logger.error(`Connection monitor poll failed: ${err.message}`);
  }
};

/**
 * Start periodic polling (default 5 minutes)
 */
const startPolling = (intervalMs: number = 300000): void => {
  logger.info(`Connection monitor: starting (interval: ${intervalMs / 1000}s)`);
  // Initial poll after 30s delay (let server fully boot)
  setTimeout(pollAllRouters, 30000);
  pollInterval = setInterval(pollAllRouters, intervalMs);
};

const stopPolling = (): void => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    logger.info('Connection monitor: stopped');
  }
};

/** Get current cached connections for a router */
const getCurrentConnections = (routerId: string): CachedConnection[] => {
  const map = previousState.get(routerId);
  return map ? Array.from(map.values()) : [];
};

/** Get total online count across all routers */
const getTotalOnline = (): number => {
  let total = 0;
  for (const map of previousState.values()) total += map.size;
  return total;
};

export default { startPolling, stopPolling, pollAllRouters, getCurrentConnections, getTotalOnline };
