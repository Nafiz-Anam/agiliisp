import httpStatus from 'http-status';
import { Router, Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError';
import prisma from '../client';
import mikrotikService from './mikrotik.service';
import logger from '../config/logger';

/**
 * Create a new router
 */
const createRouter = async (
  routerBody: Omit<Prisma.RouterCreateInput, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Router> => {
  // Check for duplicate name
  const existingRouter = await prisma.router.findUnique({
    where: { name: routerBody.name },
  });

  if (existingRouter) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Router name already exists');
  }

  return prisma.router.create({
    data: routerBody,
  });
};

/**
 * Get all routers with pagination
 */
const getRouters = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;

  const where: Prisma.RouterWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { host: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status as any;
  }

  const skip = (page - 1) * limit;

  const [routers, total] = await Promise.all([
    prisma.router.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: {
            customers: true,
            packages: true,
          },
        },
      },
    }),
    prisma.router.count({ where }),
  ]);

  return {
    data: routers,
    meta: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    },
  };
};

/**
 * Get router by ID
 */
const getRouterById = async (id: string): Promise<Router | null> => {
  return prisma.router.findUnique({
    where: { id },
    include: {
      packages: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          downloadSpeed: true,
          uploadSpeed: true,
          price: true,
        },
      },
      _count: {
        select: {
          customers: true,
          packages: true,
        },
      },
    },
  });
};

/**
 * Update router by ID
 */
const updateRouterById = async (
  routerId: string,
  updateBody: Prisma.RouterUpdateInput
): Promise<Router> => {
  const router = await getRouterById(routerId);
  if (!router) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
  }

  // Check for duplicate name if name is being updated
  if (updateBody.name && updateBody.name !== router.name) {
    const existingRouter = await prisma.router.findUnique({
      where: { name: updateBody.name as string },
    });

    if (existingRouter) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Router name already exists');
    }
  }

  return prisma.router.update({
    where: { id: routerId },
    data: updateBody,
  });
};

/**
 * Delete router by ID
 */
const deleteRouterById = async (routerId: string): Promise<Router> => {
  const router = await getRouterById(routerId);
  if (!router) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
  }

  // Check if router has customers
  const customerCount = await prisma.ispCustomer.count({
    where: { routerId },
  });

  if (customerCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete router with ${customerCount} active customers. Please reassign customers first.`
    );
  }

  // Delete all related packages first
  await prisma.internetPackage.deleteMany({
    where: { routerId },
  });

  return prisma.router.delete({
    where: { id: routerId },
  });
};

/**
 * Test router connection
 */
const testRouterConnection = async (routerId: string) => {
  return mikrotikService.testConnection(routerId);
};

/**
 * Get router statistics
 */
const getRouterStats = async (routerId: string) => {
  const router = await getRouterById(routerId);
  if (!router) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
  }

  try {
    // Get active connections
    const activeConnections = await mikrotikService.getActiveConnections(routerId);

    // Get total customers
    const totalCustomers = await prisma.ispCustomer.count({
      where: { routerId },
    });

    // Get online customers count
    const onlineCustomers = activeConnections.length;

    // Get total packages
    const totalPackages = await prisma.internetPackage.count({
      where: { routerId, isActive: true },
    });

    return {
      routerId,
      routerName: router.name,
      status: router.status,
      totalCustomers,
      onlineCustomers,
      offlineCustomers: totalCustomers - onlineCustomers,
      totalPackages,
      lastSyncAt: router.lastSyncAt,
      lastConnectedAt: router.lastConnectedAt,
      activeConnections: activeConnections.map((conn) => ({
        name: conn.name,
        address: conn.address,
        uptime: conn.uptime,
        service: conn.service,
      })),
    };
  } catch (error: any) {
    logger.error(`Failed to get router stats for ${routerId}:`, error);
    throw new ApiError(httpStatus.BAD_GATEWAY, `Failed to fetch router statistics: ${error.message}`);
  }
};

/**
 * Sync customers from router to CRM
 */
const syncCustomersFromRouter = async (routerId: string, triggeredBy?: string) => {
  return mikrotikService.syncCustomersFromRouter(routerId, triggeredBy);
};

/**
 * Sync packages from router to CRM
 */
const syncPackagesFromRouter = async (routerId: string, triggeredBy?: string) => {
  return mikrotikService.syncPackagesFromRouter(routerId, triggeredBy);
};

/**
 * Get all routers summary (for dropdowns)
 */
const getRoutersSummary = async () => {
  return prisma.router.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      host: true,
      status: true,
      _count: {
        select: {
          customers: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
};

export default {
  createRouter,
  getRouters,
  getRouterById,
  updateRouterById,
  deleteRouterById,
  testRouterConnection,
  getRouterStats,
  syncCustomersFromRouter,
  syncPackagesFromRouter,
  getRoutersSummary,
};
