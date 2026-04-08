import httpStatus from 'http-status';
import { Router, RouterStatus, SyncDirection, SyncStatus, Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError';
import prisma from '../client';
import logger from '../config/logger';

// MikroTik API response types
interface MikrotikResponse {
  data: any[];
  error?: string;
}

interface PPPoESecret {
  '.id': string;
  name: string;
  password?: string;
  profile: string;
  service: string;
  disabled: string;
  'last-caller-id'?: string;
  'last-logged-out'?: string;
  comment?: string;
}

interface BandwidthProfile {
  '.id': string;
  name: string;
  'rate-limit'?: string;
  'queue-type'?: string;
  'burst-rate'?: string;
  'burst-threshold'?: string;
  'burst-time'?: string;
  priority?: string;
  comment?: string;
}

interface ActiveConnection {
  '.id': string;
  name: string;
  service: string;
  callerId: string;
  address: string;
  uptime: string;
  encoding?: string;
  sessionId?: string;
  limitBytesIn?: string;
  limitBytesOut?: string;
}

/**
 * MikroTik Service for router management and sync
 */
class MikroTikService {
  /**
   * Make API request to MikroTik router
   */
  private async apiRequest(
    router: Router,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<MikrotikResponse> {
    try {
      const protocol = router.useSSL ? 'https' : 'http';
      const url = `${protocol}://${router.host}:${router.port}/rest${endpoint}`;

      const auth = Buffer.from(`${router.username}:${router.password}`).toString('base64');

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`MikroTik API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return { data: Array.isArray(result) ? result : [result] };
    } catch (error: any) {
      logger.error(`MikroTik API request failed for router ${router.name}:`, error);
      throw new ApiError(httpStatus.BAD_GATEWAY, `Router API error: ${error.message}`);
    }
  }

  /**
   * Test router connection
   */
  async testConnection(routerId: string): Promise<{ success: boolean; message: string }> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    try {
      // Try to fetch system resource info
      await this.apiRequest(router, '/system/resource', 'GET');

      // Update router status
      await prisma.router.update({
        where: { id: routerId },
        data: {
          status: RouterStatus.ONLINE,
          lastConnectedAt: new Date(),
        },
      });

      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      await prisma.router.update({
        where: { id: routerId },
        data: {
          status: RouterStatus.OFFLINE,
        },
      });

      return { success: false, message: error.message };
    }
  }

  /**
   * Get PPPoE secrets from router
   */
  async getPPPoESecrets(routerId: string): Promise<PPPoESecret[]> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    try {
      const response = await this.apiRequest(router, '/ppp/secret', 'GET');
      return response.data as PPPoESecret[];
    } catch (error) {
      logger.error(`Failed to get PPPoE secrets from router ${router.name}:`, error);
      throw error;
    }
  }

  /**
   * Create PPPoE secret on router
   */
  async createPPPoESecret(
    routerId: string,
    secret: {
      name: string;
      password: string;
      profile: string;
      service?: string;
      comment?: string;
    }
  ): Promise<PPPoESecret> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    try {
      const response = await this.apiRequest(router, '/ppp/secret', 'POST', {
        name: secret.name,
        password: secret.password,
        profile: secret.profile,
        service: secret.service || 'pppoe',
        comment: secret.comment || '',
        disabled: 'false',
      });

      return response.data[0] as PPPoESecret;
    } catch (error) {
      logger.error(`Failed to create PPPoE secret on router ${router.name}:`, error);
      throw error;
    }
  }

  /**
   * Update PPPoE secret on router
   */
  async updatePPPoESecret(
    routerId: string,
    secretId: string,
    updates: {
      name?: string;
      password?: string;
      profile?: string;
      disabled?: boolean;
      comment?: string;
    }
  ): Promise<PPPoESecret> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.password) updateData.password = updates.password;
      if (updates.profile) updateData.profile = updates.profile;
      if (updates.disabled !== undefined) updateData.disabled = updates.disabled ? 'true' : 'false';
      if (updates.comment !== undefined) updateData.comment = updates.comment;

      const response = await this.apiRequest(
        router,
        `/ppp/secret/${secretId}`,
        'PUT',
        updateData
      );

      return response.data[0] as PPPoESecret;
    } catch (error) {
      logger.error(`Failed to update PPPoE secret on router ${router.name}:`, error);
      throw error;
    }
  }

  /**
   * Delete PPPoE secret from router
   */
  async deletePPPoESecret(routerId: string, secretId: string): Promise<void> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    try {
      await this.apiRequest(router, `/ppp/secret/${secretId}`, 'DELETE');
    } catch (error) {
      logger.error(`Failed to delete PPPoE secret from router ${router.name}:`, error);
      throw error;
    }
  }

  /**
   * Get bandwidth profiles from router
   */
  async getBandwidthProfiles(routerId: string): Promise<BandwidthProfile[]> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    try {
      const response = await this.apiRequest(router, '/ppp/profile', 'GET');
      return response.data as BandwidthProfile[];
    } catch (error) {
      logger.error(`Failed to get bandwidth profiles from router ${router.name}:`, error);
      throw error;
    }
  }

  /**
   * Create bandwidth profile on router
   */
  async createBandwidthProfile(
    routerId: string,
    profile: {
      name: string;
      rateLimit: string;
      burstRate?: string;
      burstThreshold?: string;
      burstTime?: string;
      comment?: string;
    }
  ): Promise<BandwidthProfile> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    try {
      const data: any = {
        name: profile.name,
        'rate-limit': profile.rateLimit,
        comment: profile.comment || '',
      };

      if (profile.burstRate) data['burst-rate'] = profile.burstRate;
      if (profile.burstThreshold) data['burst-threshold'] = profile.burstThreshold;
      if (profile.burstTime) data['burst-time'] = profile.burstTime;

      const response = await this.apiRequest(router, '/ppp/profile', 'POST', data);

      return response.data[0] as BandwidthProfile;
    } catch (error) {
      logger.error(`Failed to create bandwidth profile on router ${router.name}:`, error);
      throw error;
    }
  }

  /**
   * Update bandwidth profile on router
   */
  async updateBandwidthProfile(
    routerId: string,
    profileId: string,
    updates: {
      name?: string;
      rateLimit?: string;
      burstRate?: string;
      burstThreshold?: string;
      burstTime?: string;
      comment?: string;
    }
  ): Promise<BandwidthProfile> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.rateLimit) updateData['rate-limit'] = updates.rateLimit;
      if (updates.burstRate) updateData['burst-rate'] = updates.burstRate;
      if (updates.burstThreshold) updateData['burst-threshold'] = updates.burstThreshold;
      if (updates.burstTime) updateData['burst-time'] = updates.burstTime;
      if (updates.comment !== undefined) updateData.comment = updates.comment;

      const response = await this.apiRequest(
        router,
        `/ppp/profile/${profileId}`,
        'PUT',
        updateData
      );

      return response.data[0] as BandwidthProfile;
    } catch (error) {
      logger.error(`Failed to update bandwidth profile on router ${router.name}:`, error);
      throw error;
    }
  }

  /**
   * Delete bandwidth profile from router
   */
  async deleteBandwidthProfile(routerId: string, profileId: string): Promise<void> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    try {
      await this.apiRequest(router, `/ppp/profile/${profileId}`, 'DELETE');
    } catch (error) {
      logger.error(`Failed to delete bandwidth profile from router ${router.name}:`, error);
      throw error;
    }
  }

  /**
   * Get active PPPoE connections
   */
  async getActiveConnections(routerId: string): Promise<ActiveConnection[]> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    try {
      const response = await this.apiRequest(router, '/ppp/active', 'GET');
      return response.data as ActiveConnection[];
    } catch (error) {
      logger.error(`Failed to get active connections from router ${router.name}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect active PPPoE user
   */
  async disconnectActiveUser(routerId: string, connectionId: string): Promise<void> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    try {
      await this.apiRequest(router, `/ppp/active/${connectionId}`, 'DELETE');
    } catch (error) {
      logger.error(`Failed to disconnect user from router ${router.name}:`, error);
      throw error;
    }
  }

  /**
   * Sync customers from MikroTik to CRM
   */
  async syncCustomersFromRouter(
    routerId: string,
    triggeredBy?: string
  ): Promise<{
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
      include: { packages: true },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        routerId,
        syncType: 'CUSTOMERS',
        direction: SyncDirection.MIKROTIK_TO_CRM,
        status: SyncStatus.IN_PROGRESS,
        triggeredBy: triggeredBy || undefined,
      },
    });

    const secrets = await this.getPPPoESecrets(routerId);
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (const secret of secrets) {
      try {
        // Find matching package
        const packageRecord = router.packages.find(
          (p) => p.mikrotikId === secret.profile || p.name === secret.profile
        );

        if (!packageRecord) {
          errors.push(`No matching package for profile: ${secret.profile} (user: ${secret.name})`);
          continue;
        }

        // Check if customer already exists
        const existingCustomer = await prisma.ispCustomer.findFirst({
          where: {
            OR: [{ username: secret.name }, { mikrotikId: secret['.id'] }],
          },
        });

        if (existingCustomer) {
          // Update existing customer
          await prisma.ispCustomer.update({
            where: { id: existingCustomer.id },
            data: {
              mikrotikId: secret['.id'],
              username: secret.name,
              password: secret.password || existingCustomer.password,
              packageId: packageRecord.id,
              routerId: router.id,
              status: secret.disabled === 'true' ? 'SUSPENDED' : 'ACTIVE',
              lastSyncAt: new Date(),
            },
          });
          updated++;
        } else {
          // Create new customer
          await prisma.ispCustomer.create({
            data: {
              mikrotikId: secret['.id'],
              username: secret.name,
              password: secret.password || '',
              packageId: packageRecord.id,
              routerId: router.id,
              fullName: secret.name,
              status: secret.disabled === 'true' ? 'SUSPENDED' : 'ACTIVE',
              lastSyncAt: new Date(),
            },
          });
          created++;
        }
      } catch (error: any) {
        errors.push(`Failed to sync user ${secret.name}: ${error.message}`);
      }
    }

    // Update sync log
    const recordsProcessed = created + updated;
    const failed = errors.length;

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: failed > 0 ? SyncStatus.PARTIAL_SUCCESS : SyncStatus.SUCCESS,
        completedAt: new Date(),
        recordsProcessed,
        recordsCreated: created,
        recordsUpdated: updated,
        recordsFailed: failed,
        errorMessage: failed > 0 ? errors.join('; ') : undefined,
        details: { secretsCount: secrets.length },
      },
    });

    // Update router last sync time
    await prisma.router.update({
      where: { id: routerId },
      data: { lastSyncAt: new Date() },
    });

    return { created, updated, failed: errors.length, errors };
  }

  /**
   * Sync packages from MikroTik to CRM
   */
  async syncPackagesFromRouter(
    routerId: string,
    triggeredBy?: string
  ): Promise<{
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    // Create sync log
    const syncLog = await prisma.syncLog.create({
      data: {
        routerId,
        syncType: 'PACKAGES',
        direction: SyncDirection.MIKROTIK_TO_CRM,
        status: SyncStatus.IN_PROGRESS,
        triggeredBy: triggeredBy || undefined,
      },
    });

    const profiles = await this.getBandwidthProfiles(routerId);
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (const profile of profiles) {
      try {
        // Parse rate limit (format: download/upload or download)
        const rateLimit = profile['rate-limit'] || '0/0';
        const [downloadStr, uploadStr] = rateLimit.split('/');

        // Parse speed values (handle units like M, k)
        const parseSpeed = (speed: string): number => {
          if (!speed) return 0;
          const match = speed.match(/^(\d+)([Mk])?/i);
          if (!match) return 0;
          const value = parseInt(match[1], 10);
          const unit = match[2]?.toLowerCase();
          if (unit === 'm') return value;
          if (unit === 'k') return Math.round(value / 1000);
          return value;
        };

        const downloadSpeed = parseSpeed(downloadStr);
        const uploadSpeed = parseSpeed(uploadStr || downloadStr);

        // Check if package already exists
        const existingPackage = await prisma.internetPackage.findFirst({
          where: {
            routerId,
            OR: [{ mikrotikId: profile['.id'] }, { name: profile.name }],
          },
        });

        if (existingPackage) {
          // Update existing package
          await prisma.internetPackage.update({
            where: { id: existingPackage.id },
            data: {
              mikrotikId: profile['.id'],
              name: profile.name,
              downloadSpeed,
              uploadSpeed,
              burstDownload: profile['burst-rate'] ? parseSpeed(profile['burst-rate']) : undefined,
              burstUpload: profile['burst-rate'] ? parseSpeed(profile['burst-rate']) : undefined,
              threshold: profile['burst-threshold']
                ? parseSpeed(profile['burst-threshold'])
                : undefined,
              burstTime: profile['burst-time'] ? parseInt(profile['burst-time'], 10) : undefined,
              priority: profile.priority ? parseInt(profile.priority, 10) : 8,
              lastSyncAt: new Date(),
            },
          });
          updated++;
        } else {
          // Create new package with default price
          await prisma.internetPackage.create({
            data: {
              routerId,
              mikrotikId: profile['.id'],
              name: profile.name,
              downloadSpeed,
              uploadSpeed,
              burstDownload: profile['burst-rate']
                ? parseSpeed(profile['burst-rate'])
                : undefined,
              burstUpload: profile['burst-rate'] ? parseSpeed(profile['burst-rate']) : undefined,
              threshold: profile['burst-threshold']
                ? parseSpeed(profile['burst-threshold'])
                : undefined,
              burstTime: profile['burst-time'] ? parseInt(profile['burst-time'], 10) : undefined,
              priority: profile.priority ? parseInt(profile.priority, 10) : 8,
              price: new Prisma.Decimal(0), // Default price, needs manual update
              lastSyncAt: new Date(),
            },
          });
          created++;
        }
      } catch (error: any) {
        errors.push(`Failed to sync profile ${profile.name}: ${error.message}`);
      }
    }

    // Update sync log
    const recordsProcessed = created + updated;
    const failed = errors.length;

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: failed > 0 ? SyncStatus.PARTIAL_SUCCESS : SyncStatus.SUCCESS,
        completedAt: new Date(),
        recordsProcessed,
        recordsCreated: created,
        recordsUpdated: updated,
        recordsFailed: failed,
        errorMessage: failed > 0 ? errors.join('; ') : undefined,
        details: { profilesCount: profiles.length },
      },
    });

    // Update router last sync time
    await prisma.router.update({
      where: { id: routerId },
      data: { lastSyncAt: new Date() },
    });

    return { created, updated, failed: errors.length, errors };
  }

  /**
   * Sync customer from CRM to MikroTik
   */
  async syncCustomerToRouter(
    customerId: string,
    triggeredBy?: string
  ): Promise<PPPoESecret> {
    const customer = await prisma.ispCustomer.findUnique({
      where: { id: customerId },
      include: { router: true, package: true },
    });

    if (!customer) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
    }

    if (!customer.router || !customer.package) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Customer must have router and package assigned');
    }

    // Check if secret already exists on router
    const secrets = await this.getPPPoESecrets(customer.router.id);
    const existingSecret = secrets.find(
      (s) => s.name === customer.username || s['.id'] === customer.mikrotikId
    );

    if (existingSecret) {
      // Update existing secret
      return await this.updatePPPoESecret(customer.router.id, existingSecret['.id'], {
        name: customer.username,
        password: customer.password || undefined,
        profile: customer.package.name,
        disabled: customer.status === 'SUSPENDED',
        comment: customer.fullName,
      });
    } else {
      // Create new secret
      if (!customer.password) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Password is required to create PPPoE secret');
      }

      return await this.createPPPoESecret(customer.router.id, {
        name: customer.username,
        password: customer.password,
        profile: customer.package.name,
        comment: customer.fullName,
      });
    }
  }
}

export default new MikroTikService();
