import prisma from '../client';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';

const db = prisma as any;

const createSupplier = async (body: {
  name: string; contactName?: string; email?: string; phone?: string;
  address?: string; city?: string; website?: string; taxId?: string; notes?: string;
}) => {
  return db.supplier.create({ data: body });
};

const getSuppliers = async (options: { isActive?: string; search?: string; page?: number; limit?: number }) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 50;
  const where: any = {};

  if (options.isActive !== undefined) where.isActive = options.isActive === 'true';
  if (options.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { contactName: { contains: options.search, mode: 'insensitive' } },
      { email: { contains: options.search, mode: 'insensitive' } },
      { phone: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [suppliers, total] = await Promise.all([
    db.supplier.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
    }),
    db.supplier.count({ where }),
  ]);

  return { data: suppliers, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

const getSupplierById = async (id: string) => {
  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      _count: { select: { purchaseOrders: true } },
      purchaseOrders: {
        orderBy: { orderDate: 'desc' },
        take: 10,
        select: { id: true, orderNumber: true, status: true, totalAmount: true, orderDate: true },
      },
    },
  });
  if (!supplier) throw new ApiError(httpStatus.NOT_FOUND, 'Supplier not found');
  return supplier;
};

const updateSupplier = async (id: string, body: any) => {
  await getSupplierById(id);
  return db.supplier.update({ where: { id }, data: body });
};

const deleteSupplier = async (id: string) => {
  const supplier = await getSupplierById(id);
  if (supplier._count.purchaseOrders > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete supplier with existing purchase orders. Deactivate instead.');
  }
  return db.supplier.delete({ where: { id } });
};

export default { createSupplier, getSuppliers, getSupplierById, updateSupplier, deleteSupplier };
