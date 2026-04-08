import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '../utils/ApiError';

// ═══════════════════════════════════════════
// Categories
// ═══════════════════════════════════════════

const getCategories = async () => {
  return prisma.inventoryCategory.findMany({
    where: { isActive: true },
    include: { _count: { select: { items: true } } },
    orderBy: { name: 'asc' },
  });
};

const createCategory = async (data: { name: string; description?: string }) => {
  const existing = await prisma.inventoryCategory.findUnique({ where: { name: data.name } });
  if (existing) throw new ApiError(httpStatus.CONFLICT, 'Category already exists');
  return prisma.inventoryCategory.create({ data });
};

const updateCategory = async (id: string, data: { name?: string; description?: string; isActive?: boolean }) => {
  const cat = await prisma.inventoryCategory.findUnique({ where: { id } });
  if (!cat) throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  if (data.name && data.name !== cat.name) {
    const existing = await prisma.inventoryCategory.findUnique({ where: { name: data.name } });
    if (existing) throw new ApiError(httpStatus.CONFLICT, 'Category name already exists');
  }
  return prisma.inventoryCategory.update({ where: { id }, data });
};

const deleteCategory = async (id: string) => {
  const cat = await prisma.inventoryCategory.findUnique({ where: { id }, include: { _count: { select: { items: true } } } });
  if (!cat) throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  if (cat._count.items > 0) throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete category with items');
  await prisma.inventoryCategory.delete({ where: { id } });
};

// ═══════════════════════════════════════════
// Inventory Items
// ═══════════════════════════════════════════

const getItems = async (query: any) => {
  const { page = 1, limit = 10, search, categoryId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
  const where: any = { isActive: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      include: { category: true },
      orderBy: { [sortBy as string]: sortOrder },
      skip,
      take: Number(limit),
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return {
    data: items,
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
  };
};

const getItemById = async (id: string) => {
  const item = await prisma.inventoryItem.findUnique({ where: { id }, include: { category: true } });
  if (!item) throw new ApiError(httpStatus.NOT_FOUND, 'Inventory item not found');
  return item;
};

const createItem = async (data: any, userId: string) => {
  const existing = await prisma.inventoryItem.findUnique({ where: { sku: data.sku } });
  if (existing) throw new ApiError(httpStatus.CONFLICT, 'SKU already exists');

  return prisma.inventoryItem.create({
    data: {
      name: data.name,
      sku: data.sku,
      categoryId: data.categoryId,
      brand: data.brand,
      model: data.model,
      description: data.description,
      unitCost: data.unitCost || 0,
      sellingPrice: data.sellingPrice,
      minStockThreshold: data.minStockThreshold || 5,
      createdBy: userId,
    },
  });
};

const updateItem = async (id: string, data: any) => {
  await getItemById(id);

  if (data.sku) {
    const existing = await prisma.inventoryItem.findFirst({ where: { sku: data.sku, NOT: { id } } });
    if (existing) throw new ApiError(httpStatus.CONFLICT, 'SKU already exists');
  }

  return prisma.inventoryItem.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.brand !== undefined && { brand: data.brand }),
      ...(data.model !== undefined && { model: data.model }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.unitCost !== undefined && { unitCost: data.unitCost }),
      ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
      ...(data.minStockThreshold !== undefined && { minStockThreshold: data.minStockThreshold }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
};

const deleteItem = async (id: string) => {
  await getItemById(id);
  await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
};

// ═══════════════════════════════════════════
// Transactions
// ═══════════════════════════════════════════

const recordTransaction = async (itemId: string, data: any, userId: string) => {
  const item = await getItemById(itemId);

  const { type, quantity, condition, customerId, purchaseOrderId, reference, notes } = data;
  let newInStock = item.inStockCount;
  let newDeployed = item.deployedCount;
  let newDamaged = item.damagedCount;
  let newInRepair = item.inRepairCount;

  switch (type) {
    case 'PURCHASE_IN':
      newInStock += quantity;
      break;
    case 'DEPLOY_OUT':
      if (newInStock < quantity) throw new ApiError(httpStatus.BAD_REQUEST, 'Not enough stock to deploy');
      newInStock -= quantity;
      newDeployed += quantity;
      break;
    case 'RETURN_IN':
      newDeployed = Math.max(0, newDeployed - quantity);
      if (condition === 'DAMAGED' || condition === 'DEFECTIVE') {
        newDamaged += quantity;
      } else {
        newInStock += quantity;
      }
      break;
    case 'DAMAGE':
      newInStock = Math.max(0, newInStock - quantity);
      newDamaged += quantity;
      break;
    case 'REPAIR_SEND':
      newDamaged = Math.max(0, newDamaged - quantity);
      newInRepair += quantity;
      break;
    case 'REPAIR_RETURN':
      newInRepair = Math.max(0, newInRepair - quantity);
      newInStock += quantity;
      break;
    case 'ADJUSTMENT':
      newInStock += quantity; // can be negative
      break;
    case 'SALE':
      if (newInStock < quantity) throw new ApiError(httpStatus.BAD_REQUEST, 'Not enough stock to sell');
      newInStock -= quantity;
      break;
    case 'DECOMMISSION':
      newDamaged = Math.max(0, newDamaged - quantity);
      break;
  }

  const totalQty = newInStock + newDeployed + newDamaged + newInRepair;

  const [transaction] = await Promise.all([
    prisma.inventoryTransaction.create({
      data: {
        itemId,
        type,
        quantity,
        previousQty: item.inStockCount,
        newQty: newInStock,
        condition: condition || 'NEW',
        customerId,
        purchaseOrderId,
        reference,
        notes,
        performedBy: userId,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        inStockCount: newInStock,
        deployedCount: newDeployed,
        damagedCount: newDamaged,
        inRepairCount: newInRepair,
        totalQuantity: totalQty,
      },
    }),
  ]);

  return transaction;
};

const getTransactions = async (itemId: string, query: any) => {
  const { page = 1, limit = 20 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const [transactions, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where: { itemId },
      include: {
        performer: { select: { id: true, name: true } },
        customer: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
    }),
    prisma.inventoryTransaction.count({ where: { itemId } }),
  ]);

  return {
    data: transactions,
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
  };
};

// ═══════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════

const getDashboard = async () => {
  const items = await prisma.inventoryItem.findMany({ where: { isActive: true }, include: { category: true } });

  let totalInStock = 0, totalDeployed = 0, totalDamaged = 0, totalInRepair = 0;
  const lowStockItems: any[] = [];
  const categoryMap = new Map<string, { count: number; inStock: number }>();

  for (const item of items) {
    totalInStock += item.inStockCount;
    totalDeployed += item.deployedCount;
    totalDamaged += item.damagedCount;
    totalInRepair += item.inRepairCount;

    if (item.inStockCount <= item.minStockThreshold) {
      lowStockItems.push({ id: item.id, name: item.name, sku: item.sku, inStockCount: item.inStockCount, minStockThreshold: item.minStockThreshold });
    }

    const catName = (item as any).category?.name || 'Uncategorized';
    const cat = categoryMap.get(catName) || { count: 0, inStock: 0 };
    cat.count++;
    cat.inStock += item.inStockCount;
    categoryMap.set(catName, cat);
  }

  const pendingOrders = await prisma.purchaseOrder.count({ where: { status: { in: ['PENDING', 'ORDERED', 'PARTIALLY_RECEIVED'] } } });
  const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({ category, ...data }));

  return {
    totalItems: items.length,
    totalInStock,
    totalDeployed,
    totalDamaged,
    totalInRepair,
    lowStockItems,
    lowStockCount: lowStockItems.length,
    pendingOrders,
    categoryBreakdown,
  };
};

// ═══════════════════════════════════════════
// Purchase Orders
// ═══════════════════════════════════════════

const getPurchaseOrders = async (query: any) => {
  const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;
  const where: any = {};
  if (status) where.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [purchaseOrders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        items: { include: { inventoryItem: { select: { id: true, name: true, sku: true } } } },
        _count: { select: { items: true } },
      },
      orderBy: { [sortBy as string]: sortOrder },
      skip,
      take: Number(limit),
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    data: purchaseOrders,
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
  };
};

const getPurchaseOrderById = async (id: string) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      items: { include: { inventoryItem: true } },
      creator: { select: { id: true, name: true } },
    },
  });
  if (!po) throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
  return po;
};

const createPurchaseOrder = async (data: any, userId: string) => {
  const count = await prisma.purchaseOrder.count();
  const orderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

  let totalAmount = 0;
  const itemsData = (data.items || []).map((item: any) => {
    const total = Number(item.quantity) * Number(item.unitCost);
    totalAmount += total;
    return {
      inventoryItemId: item.inventoryItemId,
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
      totalCost: total,
    };
  });

  return prisma.purchaseOrder.create({
    data: {
      orderNumber,
      supplier: data.supplier,
      supplierContact: data.supplierContact,
      supplierEmail: data.supplierEmail,
      status: 'DRAFT',
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
      notes: data.notes,
      totalAmount,
      createdBy: userId,
      items: { create: itemsData },
    },
    include: { items: { include: { inventoryItem: true } } },
  });
};

const updatePurchaseOrder = async (id: string, data: any) => {
  const po = await getPurchaseOrderById(id);
  if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot update completed/cancelled order');
  }

  return prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...(data.supplier !== undefined && { supplier: data.supplier }),
      ...(data.supplierContact !== undefined && { supplierContact: data.supplierContact }),
      ...(data.supplierEmail !== undefined && { supplierEmail: data.supplierEmail }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.expectedDate !== undefined && { expectedDate: new Date(data.expectedDate) }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
};

const receivePurchaseOrder = async (id: string, data: any, userId: string) => {
  const po = await getPurchaseOrderById(id);
  if (!['ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order must be in ORDERED or PARTIALLY_RECEIVED status');
  }

  const receivedItems = data.items || [];
  let allFullyReceived = true;

  for (const received of receivedItems) {
    const poItem = po.items.find((i: any) => i.inventoryItemId === received.inventoryItemId);
    if (!poItem) continue;

    const qty = Number(received.receivedQuantity);
    if (qty <= 0) continue;

    // Update PO item
    const newReceivedQty = poItem.receivedQuantity + qty;
    await prisma.purchaseOrderItem.update({
      where: { id: poItem.id },
      data: { receivedQuantity: newReceivedQty },
    });

    if (newReceivedQty < poItem.quantity) allFullyReceived = false;

    // Record transaction and update stock
    const item = await prisma.inventoryItem.findUnique({ where: { id: received.inventoryItemId } });
    if (!item) continue;

    const newInStock = item.inStockCount + qty;
    const totalQty = newInStock + item.deployedCount + item.damagedCount + item.inRepairCount;

    await Promise.all([
      prisma.inventoryTransaction.create({
        data: {
          itemId: item.id,
          type: 'PURCHASE_IN',
          quantity: qty,
          previousQty: item.inStockCount,
          newQty: newInStock,
          condition: 'NEW',
          purchaseOrderId: id,
          reference: po.orderNumber,
          notes: `Received from PO ${po.orderNumber}`,
          performedBy: userId,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: { inStockCount: newInStock, totalQuantity: totalQty },
      }),
    ]);
  }

  // Check if fully received
  const updatedPo = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
  const fullyReceived = updatedPo!.items.every((i: any) => i.receivedQuantity >= i.quantity);

  await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: fullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
      receivedDate: fullyReceived ? new Date() : undefined,
    },
  });

  return getPurchaseOrderById(id);
};

export default {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  recordTransaction,
  getTransactions,
  getDashboard,
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
};
