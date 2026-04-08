import httpStatus from 'http-status';
import { InternetPackage, Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError';
import prisma from '../client';
import mikrotikService from './mikrotik.service';

/**
 * Create a new internet package
 */
const createPackage = async (
  packageBody: Omit<Prisma.InternetPackageCreateInput, 'id' | 'createdAt' | 'updatedAt'>
): Promise<InternetPackage> => {
  // Check for duplicate name within the same router
  const existingPackage = await prisma.internetPackage.findFirst({
    where: {
      name: packageBody.name as string,
      routerId: packageBody.router?.connect?.id as string,
    },
  });

  if (existingPackage) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Package name already exists for this router');
  }

  return prisma.internetPackage.create({
    data: packageBody,
  });
};

/**
 * Get all packages with pagination
 */
const getPackages = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  routerId?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const {
    page = 1,
    limit = 10,
    search,
    routerId,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const where: Prisma.InternetPackageWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (routerId) {
    where.routerId = routerId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const skip = (page - 1) * limit;

  const [packages, total] = await Promise.all([
    prisma.internetPackage.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        router: {
          select: {
            id: true,
            name: true,
            host: true,
            status: true,
          },
        },
        _count: {
          select: {
            customers: true,
          },
        },
      },
    }),
    prisma.internetPackage.count({ where }),
  ]);

  return {
    data: packages,
    meta: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    },
  };
};

/**
 * Get package by ID
 */
const getPackageById = async (id: string): Promise<InternetPackage | null> => {
  return prisma.internetPackage.findUnique({
    where: { id },
    include: {
      router: {
        select: {
          id: true,
          name: true,
          host: true,
          status: true,
        },
      },
      _count: {
        select: {
          customers: true,
        },
      },
    },
  });
};

/**
 * Update package by ID
 */
const updatePackageById = async (
  packageId: string,
  updateBody: Prisma.InternetPackageUpdateInput
): Promise<InternetPackage> => {
  const pkg = await getPackageById(packageId);
  if (!pkg) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Package not found');
  }

  // Check for duplicate name if name is being updated
  if (updateBody.name && updateBody.name !== pkg.name) {
    const existingPackage = await prisma.internetPackage.findFirst({
      where: {
        name: updateBody.name as string,
        routerId: pkg.routerId,
        id: { not: packageId },
      },
    });

    if (existingPackage) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Package name already exists for this router');
    }
  }

  return prisma.internetPackage.update({
    where: { id: packageId },
    data: updateBody,
  });
};

/**
 * Delete package by ID
 */
const deletePackageById = async (packageId: string): Promise<InternetPackage> => {
  const pkg = await getPackageById(packageId);
  if (!pkg) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Package not found');
  }

  // Check if package has customers
  const customerCount = await prisma.ispCustomer.count({
    where: { packageId },
  });

  if (customerCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete package with ${customerCount} active customers. Please reassign customers first.`
    );
  }

  return prisma.internetPackage.delete({
    where: { id: packageId },
  });
};

/**
 * Sync package to MikroTik router
 */
const syncPackageToRouter = async (packageId: string) => {
  const pkg = await prisma.internetPackage.findUnique({
    where: { id: packageId },
    include: { router: true },
  });

  if (!pkg) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Package not found');
  }

  if (!pkg.router) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Package must be assigned to a router');
  }

  // Format rate limit
  const rateLimit = `${pkg.downloadSpeed}M/${pkg.uploadSpeed}M`;

  // Build burst parameters if present
  let burstRate: string | undefined;
  let burstThreshold: string | undefined;

  if (pkg.burstDownload && pkg.burstUpload) {
    burstRate = `${pkg.burstDownload}M/${pkg.burstUpload}M`;
  }
  if (pkg.threshold) {
    burstThreshold = `${pkg.threshold}M/${pkg.threshold}M`;
  }

  if (pkg.mikrotikId) {
    // Update existing profile
    return mikrotikService.updateBandwidthProfile(pkg.router.id, pkg.mikrotikId, {
      name: pkg.name,
      rateLimit,
      burstRate,
      burstThreshold,
      burstTime: pkg.burstTime?.toString(),
    });
  } else {
    // Create new profile
    const created = await mikrotikService.createBandwidthProfile(pkg.router.id, {
      name: pkg.name,
      rateLimit,
      burstRate,
      burstThreshold,
      burstTime: pkg.burstTime?.toString(),
    });

    // Update package with MikroTik ID
    await prisma.internetPackage.update({
      where: { id: packageId },
      data: { mikrotikId: created['.id'], lastSyncAt: new Date() },
    });

    return created;
  }
};

/**
 * Get all packages summary (for dropdowns)
 */
const getPackagesSummary = async (routerId?: string) => {
  const where: Prisma.InternetPackageWhereInput = {
    isActive: true,
    isPublic: true,
  };

  if (routerId) {
    where.routerId = routerId;
  }

  return prisma.internetPackage.findMany({
    where,
    select: {
      id: true,
      name: true,
      downloadSpeed: true,
      uploadSpeed: true,
      price: true,
      routerId: true,
      router: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { price: 'asc' },
  });
};

/**
 * Get packages by reseller (with markup applied)
 */
const getResellerPackages = async (resellerId: string) => {
  const reseller = await prisma.reseller.findUnique({
    where: { id: resellerId },
  });

  if (!reseller) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Reseller not found');
  }

  const packages = await prisma.internetPackage.findMany({
    where: {
      isActive: true,
      isPublic: true,
    },
    select: {
      id: true,
      name: true,
      downloadSpeed: true,
      uploadSpeed: true,
      price: true,
      costPrice: true,
      routerId: true,
      router: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { price: 'asc' },
  });

  // Apply reseller markup
  return packages.map((pkg) => {
    const basePrice = pkg.costPrice || pkg.price;
    const markupMultiplier = 1 + (reseller.markupPercentage.toNumber() / 100);
    const resellerPrice = basePrice.mul(markupMultiplier);

    return {
      ...pkg,
      basePrice: pkg.price,
      resellerPrice,
      commission: resellerPrice.sub(basePrice),
    };
  });
};

export default {
  createPackage,
  getPackages,
  getPackageById,
  updatePackageById,
  deletePackageById,
  syncPackageToRouter,
  getPackagesSummary,
  getResellerPackages,
};
