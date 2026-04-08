import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated, sendDeleted } from '../utils/apiResponse';
import inventoryService from '../services/inventory.service';

// Categories
const getCategories = catchAsync(async (req: Request, res: Response) => {
  const categories = await inventoryService.getCategories();
  return sendSuccess(res, { categories }, 'Categories retrieved', undefined, (req as any).requestId);
});

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await inventoryService.createCategory(req.body);
  return sendCreated(res, category, 'Category created', (req as any).requestId);
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await inventoryService.updateCategory(req.params.id as string, req.body);
  return sendSuccess(res, category, 'Category updated', undefined, (req as any).requestId);
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  await inventoryService.deleteCategory(req.params.id as string);
  return sendDeleted(res, 'Category deleted', (req as any).requestId);
});

// Items
const getItems = catchAsync(async (req: Request, res: Response) => {
  const result = await inventoryService.getItems(req.query);
  return sendSuccess(res, { items: result.data }, 'Items retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getItemById = catchAsync(async (req: Request, res: Response) => {
  const item = await inventoryService.getItemById(req.params.id as string);
  return sendSuccess(res, item, 'Item retrieved', undefined, (req as any).requestId);
});

const createItem = catchAsync(async (req: Request, res: Response) => {
  const item = await inventoryService.createItem(req.body, (req.user as any).id);
  return sendCreated(res, item, 'Item created', (req as any).requestId);
});

const updateItem = catchAsync(async (req: Request, res: Response) => {
  const item = await inventoryService.updateItem(req.params.id as string, req.body);
  return sendSuccess(res, item, 'Item updated', undefined, (req as any).requestId);
});

const deleteItem = catchAsync(async (req: Request, res: Response) => {
  await inventoryService.deleteItem(req.params.id as string);
  return sendDeleted(res, 'Item deleted', (req as any).requestId);
});

// Transactions
const recordTransaction = catchAsync(async (req: Request, res: Response) => {
  const transaction = await inventoryService.recordTransaction(req.params.id as string, req.body, (req.user as any).id);
  return sendCreated(res, transaction, 'Transaction recorded', (req as any).requestId);
});

const getTransactions = catchAsync(async (req: Request, res: Response) => {
  const result = await inventoryService.getTransactions(req.params.id as string, req.query);
  return sendSuccess(res, { transactions: result.data }, 'Transactions retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

// Dashboard
const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const data = await inventoryService.getDashboard();
  return sendSuccess(res, data, 'Dashboard retrieved', undefined, (req as any).requestId);
});

// Purchase Orders
const getPurchaseOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await inventoryService.getPurchaseOrders(req.query);
  return sendSuccess(res, { purchaseOrders: result.data }, 'Purchase orders retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getPurchaseOrderById = catchAsync(async (req: Request, res: Response) => {
  const po = await inventoryService.getPurchaseOrderById(req.params.id as string);
  return sendSuccess(res, po, 'Purchase order retrieved', undefined, (req as any).requestId);
});

const createPurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const po = await inventoryService.createPurchaseOrder(req.body, (req.user as any).id);
  return sendCreated(res, po, 'Purchase order created', (req as any).requestId);
});

const updatePurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const po = await inventoryService.updatePurchaseOrder(req.params.id as string, req.body);
  return sendSuccess(res, po, 'Purchase order updated', undefined, (req as any).requestId);
});

const receivePurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const po = await inventoryService.receivePurchaseOrder(req.params.id as string, req.body, (req.user as any).id);
  return sendSuccess(res, po, 'Items received', undefined, (req as any).requestId);
});

export default {
  getCategories, createCategory, updateCategory, deleteCategory,
  getItems, getItemById, createItem, updateItem, deleteItem,
  recordTransaction, getTransactions,
  getDashboard,
  getPurchaseOrders, getPurchaseOrderById, createPurchaseOrder, updatePurchaseOrder, receivePurchaseOrder,
};
