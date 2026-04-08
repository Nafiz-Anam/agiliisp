import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import ispInventoryValidation from '../../../validations/ispInventory.validation';
import ispInventoryController from '../../../controllers/ispInventory.controller';

const router = express.Router();

// Categories (before :id to avoid param capture)
router.get('/categories', auth('manageInventory'), ispInventoryController.getCategories);
router.post('/categories', auth('manageInventory'), ispInventoryController.createCategory);
router.patch('/categories/:id', auth('manageInventory'), ispInventoryController.updateCategory);
router.delete('/categories/:id', auth('deleteInventory'), ispInventoryController.deleteCategory);

// Dashboard (before :id to avoid param capture)
router.get('/dashboard', auth('manageInventory'), ispInventoryController.getDashboard);

// Purchase Orders (before :id to avoid param capture)
router.get('/purchase-orders', auth('managePurchaseOrders'), ispInventoryController.getPurchaseOrders);
router.post('/purchase-orders', auth('managePurchaseOrders'), validate(ispInventoryValidation.createPurchaseOrder), ispInventoryController.createPurchaseOrder);
router.get('/purchase-orders/:id', auth('managePurchaseOrders'), ispInventoryController.getPurchaseOrderById);
router.patch('/purchase-orders/:id', auth('managePurchaseOrders'), validate(ispInventoryValidation.updatePurchaseOrder), ispInventoryController.updatePurchaseOrder);
router.post('/purchase-orders/:id/receive', auth('managePurchaseOrders'), validate(ispInventoryValidation.receivePurchaseOrder), ispInventoryController.receivePurchaseOrder);

// Items
router
  .route('/')
  .get(auth('manageInventory'), validate(ispInventoryValidation.getItems), ispInventoryController.getItems)
  .post(auth('manageInventory'), validate(ispInventoryValidation.createItem), ispInventoryController.createItem);

router
  .route('/:id')
  .get(auth('manageInventory'), ispInventoryController.getItemById)
  .patch(auth('manageInventory'), validate(ispInventoryValidation.updateItem), ispInventoryController.updateItem)
  .delete(auth('deleteInventory'), ispInventoryController.deleteItem);

// Transactions
router.post('/:id/transactions', auth('manageInventory'), validate(ispInventoryValidation.recordTransaction), ispInventoryController.recordTransaction);
router.get('/:id/transactions', auth('manageInventory'), ispInventoryController.getTransactions);

export default router;
