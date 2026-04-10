import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import ispResellerValidation from '../../../validations/ispReseller.validation';
import ispResellerController from '../../../controllers/ispReseller.controller';
import commissionController from '../../../controllers/commission.controller';
import payoutController from '../../../controllers/payout.controller';
import { uploadDocuments, uploadImage } from '../../../middlewares/upload';

const router = express.Router();

// Hierarchy tree (must be before /:resellerId)
router.get('/hierarchy/tree', auth('manageResellers'), ispResellerController.getHierarchyTree);
router.get('/summary', auth('manageResellers'), ispResellerController.getResellersSummary);

router
  .route('/')
  .get(auth('manageResellers'), validate(ispResellerValidation.getResellers), ispResellerController.getResellers)
  .post(auth('manageResellers'), validate(ispResellerValidation.createReseller), ispResellerController.createReseller);

router
  .route('/:resellerId')
  .get(auth('manageResellers'), validate(ispResellerValidation.resellerId), ispResellerController.getResellerById)
  .patch(auth('manageResellers'), validate(ispResellerValidation.updateReseller), ispResellerController.updateReseller)
  .delete(auth('deleteReseller'), validate(ispResellerValidation.resellerId), ispResellerController.deleteReseller);

// Child resellers
router.get('/:resellerId/children', auth('manageResellers'), ispResellerController.getChildren);

// Commission
router.get('/:resellerId/commissions', auth('manageResellers'), commissionController.getHistory);
router.get('/:resellerId/commissions/summary', auth('manageResellers'), commissionController.getSummary);

// Payouts (per-reseller)
router.get('/:resellerId/payouts', auth('manageResellers'), payoutController.getResellerPayouts);
router.post('/:resellerId/payouts', auth('manageResellers'), payoutController.requestPayout);
router.get('/:resellerId/payouts/summary', auth('manageResellers'), payoutController.getSummary);

// Document uploads
router.post(
  '/:resellerId/documents',
  auth('manageResellers'),
  uploadDocuments.fields([
    { name: 'businessRegistration', maxCount: 1 },
    { name: 'tinDocument', maxCount: 1 },
  ]),
  ispResellerController.uploadDocuments
);
router.post(
  '/:resellerId/logo',
  auth('manageResellers'),
  uploadImage.single('logo'),
  ispResellerController.uploadLogo
);
router.delete('/:resellerId/documents/:field', auth('manageResellers'), ispResellerController.deleteDocument);

export default router;
