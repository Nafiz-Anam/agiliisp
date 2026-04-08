import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import ispPackageValidation from '../../../validations/ispPackage.validation';
import ispPackageController from '../../../controllers/ispPackage.controller';

const router = express.Router();

router
  .route('/')
  .get(auth('managePackages'), validate(ispPackageValidation.getPackages), ispPackageController.getPackages)
  .post(auth('managePackages'), validate(ispPackageValidation.createPackage), ispPackageController.createPackage);

router
  .route('/:packageId')
  .get(auth('managePackages'), validate(ispPackageValidation.packageId), ispPackageController.getPackageById)
  .patch(auth('managePackages'), validate(ispPackageValidation.updatePackage), ispPackageController.updatePackage)
  .delete(auth('deletePackage'), validate(ispPackageValidation.packageId), ispPackageController.deletePackage);

export default router;
