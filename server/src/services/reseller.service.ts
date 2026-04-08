import httpStatus from 'http-status';
import { Reseller, Prisma, Role } from '@prisma/client';
import ApiError from '../utils/ApiError';
import prisma from '../client';
import userService from './user.service';

/**
 * Create a new reseller
 */
const createReseller = async (
  resellerBody: {
    user: {
      email: string;
      name: string;
      password: string;
      phone?: string;
    };
    businessName: string;
    businessRegistration?: string;
    taxId?: string;
    commissionRate?: number;
    creditLimit?: number;
    markupPercentage?: number;
    supportPhone?: string;
    supportEmail?: string;
    notes?: string;
  },
  createdBy?: string
): Promise<Reseller> => {
  // Check if email already exists
  const existingUser = await userService.getUserByEmail(resellerBody.user.email);
  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already exists');
  }

  // Check if business name already exists
  const existingBusiness = await prisma.reseller.findUnique({
    where: { businessName: resellerBody.businessName },
  });

  if (existingBusiness) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Business name already exists');
  }

  // Create user first
  const user = await userService.createUser({
    ...resellerBody.user,
    role: Role.RESELLER,
  });

  // Create reseller profile
  return prisma.reseller.create({
    data: {
      userId: user.id,
      businessName: resellerBody.businessName,
      businessRegistration: resellerBody.businessRegistration,
      taxId: resellerBody.taxId,
      commissionRate: resellerBody.commissionRate
        ? new Prisma.Decimal(resellerBody.commissionRate)
        : undefined,
      creditLimit: resellerBody.creditLimit
        ? new Prisma.Decimal(resellerBody.creditLimit)
        : undefined,
      markupPercentage: resellerBody.markupPercentage
        ? new Prisma.Decimal(resellerBody.markupPercentage)
        : undefined,
      supportPhone: resellerBody.supportPhone,
      supportEmail: resellerBody.supportEmail,
      notes: resellerBody.notes,
      createdBy,
    },
  });
};

/**
 * Get all resellers with pagination
 */
const getResellers = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const { page = 1, limit = 10, search, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = options;

  const where: Prisma.ResellerWhereInput = {};

  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { taxId: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const skip = (page - 1) * limit;

  const [resellers, total] = await Promise.all([
    prisma.reseller.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            customers: true,
            invoices: true,
          },
        },
      },
    }),
    prisma.reseller.count({ where }),
  ]);

  return {
    data: resellers,
    meta: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    },
  };
};

/**
 * Get reseller by ID
 */
const getResellerById = async (id: string): Promise<Reseller | null> => {
  return prisma.reseller.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
        },
      },
      customers: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          fullName: true,
          status: true,
          isOnline: true,
        },
      },
      _count: {
        select: {
          customers: true,
          invoices: true,
        },
      },
    },
  });
};

/**
 * Get reseller by user ID
 */
const getResellerByUserId = async (userId: string): Promise<Reseller | null> => {
  return prisma.reseller.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          isActive: true,
        },
      },
    },
  });
};

/**
 * Update reseller by ID
 */
const updateResellerById = async (
  resellerId: string,
  updateBody: Prisma.ResellerUpdateInput
): Promise<Reseller> => {
  const reseller = await getResellerById(resellerId);
  if (!reseller) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Reseller not found');
  }

  // Check for duplicate business name if being updated
  if (updateBody.businessName && updateBody.businessName !== reseller.businessName) {
    const existingBusiness = await prisma.reseller.findUnique({
      where: { businessName: updateBody.businessName as string },
    });

    if (existingBusiness) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Business name already exists');
    }
  }

  return prisma.reseller.update({
    where: { id: resellerId },
    data: updateBody,
  });
};

/**
 * Delete reseller by ID
 */
const deleteResellerById = async (resellerId: string): Promise<Reseller> => {
  const reseller = await getResellerById(resellerId);
  if (!reseller) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Reseller not found');
  }

  // Check if reseller has customers
  const customerCount = await prisma.ispCustomer.count({
    where: { resellerId },
  });

  if (customerCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete reseller with ${customerCount} active customers. Please reassign customers first.`
    );
  }

  // Delete reseller (user will be deleted via cascade)
  const deleted = await prisma.reseller.delete({
    where: { id: resellerId },
  });

  // Deactivate the user
  await prisma.user.update({
    where: { id: reseller.userId },
    data: { isActive: false },
  });

  return deleted;
};

/**
 * Get reseller dashboard statistics
 */
const getResellerStats = async (resellerId: string) => {
  const reseller = await getResellerById(resellerId);
  if (!reseller) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Reseller not found');
  }

  // Get customer statistics
  const customers = await prisma.ispCustomer.findMany({
    where: { resellerId },
    select: {
      status: true,
      isOnline: true,
    },
  });

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === 'ACTIVE').length;
  const suspendedCustomers = customers.filter((c) => c.status === 'SUSPENDED').length;
  const onlineCustomers = customers.filter((c) => c.isOnline).length;

  // Get invoice statistics
  const invoices = await prisma.invoice.findMany({
    where: { resellerId },
    select: {
      status: true,
      totalAmount: true,
      paidAmount: true,
    },
  });

  const totalInvoices = invoices.length;
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount.toNumber(), 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount.toNumber(), 0);
  const pendingAmount = totalRevenue - totalCollected;

  const paidInvoices = invoices.filter((inv) => inv.status === 'PAID').length;
  const pendingInvoices = invoices.filter((inv) =>
    ['DRAFT', 'SENT', 'PARTIALLY_PAID'].includes(inv.status)
  ).length;
  const overdueInvoices = invoices.filter((inv) => inv.status === 'OVERDUE').length;

  // Calculate commission
  const commission = totalCollected * reseller.commissionRate.toNumber() / 100;

  return {
    reseller: {
      id: reseller.id,
      businessName: reseller.businessName,
      currentBalance: reseller.currentBalance,
      creditLimit: reseller.creditLimit,
    },
    customers: {
      total: totalCustomers,
      active: activeCustomers,
      suspended: suspendedCustomers,
      online: onlineCustomers,
      offline: totalCustomers - onlineCustomers,
    },
    invoices: {
      total: totalInvoices,
      paid: paidInvoices,
      pending: pendingInvoices,
      overdue: overdueInvoices,
      totalRevenue,
      totalCollected,
      pendingAmount,
      commission,
    },
  };
};

/**
 * Get all resellers summary (for dropdowns)
 */
const getResellersSummary = async () => {
  return prisma.reseller.findMany({
    where: { isActive: true },
    select: {
      id: true,
      businessName: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          customers: true,
        },
      },
    },
    orderBy: { businessName: 'asc' },
  });
};

export default {
  createReseller,
  getResellers,
  getResellerById,
  getResellerByUserId,
  updateResellerById,
  deleteResellerById,
  getResellerStats,
  getResellersSummary,
};
