import { z } from 'zod';

const transactionTypes = ['PURCHASE_IN', 'DEPLOY_OUT', 'RETURN_IN', 'DAMAGE', 'REPAIR_SEND', 'REPAIR_RETURN', 'ADJUSTMENT', 'SALE', 'DECOMMISSION'] as const;
const conditions = ['NEW', 'GOOD', 'FAIR', 'DAMAGED', 'DEFECTIVE', 'DECOMMISSIONED'] as const;
const poStatuses = ['DRAFT', 'PENDING', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] as const;

const createItem = {
  body: z.object({
    name: z.string().min(1).max(200),
    sku: z.string().min(1).max(50),
    categoryId: z.string().min(1, 'Category is required'),
    brand: z.string().max(100).optional(),
    model: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
    unitCost: z.coerce.number().min(0).optional(),
    sellingPrice: z.coerce.number().min(0).optional(),
    minStockThreshold: z.coerce.number().int().min(0).optional(),
  }),
};

const updateItem = {
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    sku: z.string().min(1).max(50).optional(),
    categoryId: z.string().optional(),
    brand: z.string().max(100).nullable().optional(),
    model: z.string().max(100).nullable().optional(),
    description: z.string().max(500).nullable().optional(),
    unitCost: z.coerce.number().min(0).optional(),
    sellingPrice: z.coerce.number().min(0).nullable().optional(),
    minStockThreshold: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
};

const getItems = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(10),
    search: z.string().optional(),
    categoryId: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
};

const recordTransaction = {
  body: z.object({
    type: z.enum(transactionTypes),
    quantity: z.coerce.number().int().min(1),
    condition: z.enum(conditions).optional(),
    customerId: z.string().optional(),
    reference: z.string().max(200).optional(),
    notes: z.string().max(500).optional(),
  }),
};

const createPurchaseOrder = {
  body: z.object({
    supplier: z.string().min(1).max(200),
    supplierContact: z.string().max(100).optional(),
    supplierEmail: z.string().email().optional().or(z.literal('')),
    expectedDate: z.string().optional(),
    notes: z.string().max(500).optional(),
    items: z.array(z.object({
      inventoryItemId: z.string().min(1),
      quantity: z.coerce.number().int().min(1),
      unitCost: z.coerce.number().min(0),
    })).min(1),
  }),
};

const updatePurchaseOrder = {
  body: z.object({
    supplier: z.string().min(1).max(200).optional(),
    supplierContact: z.string().max(100).nullable().optional(),
    supplierEmail: z.string().email().optional().or(z.literal('')),
    status: z.enum(poStatuses).optional(),
    expectedDate: z.string().optional(),
    notes: z.string().max(500).nullable().optional(),
  }),
};

const receivePurchaseOrder = {
  body: z.object({
    items: z.array(z.object({
      inventoryItemId: z.string().min(1),
      receivedQuantity: z.coerce.number().int().min(1),
    })).min(1),
  }),
};

export default {
  createItem,
  updateItem,
  getItems,
  recordTransaction,
  createPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
};
