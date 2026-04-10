import express from 'express';
import auth from '../../../middlewares/auth';
import supplierController from '../../../controllers/supplier.controller';

const router = express.Router();

router
  .route('/')
  .get(auth('manageInventory'), supplierController.getSuppliers)
  .post(auth('manageInventory'), supplierController.createSupplier);

router
  .route('/:supplierId')
  .get(auth('manageInventory'), supplierController.getSupplierById)
  .patch(auth('manageInventory'), supplierController.updateSupplier)
  .delete(auth('manageInventory'), supplierController.deleteSupplier);

export default router;
