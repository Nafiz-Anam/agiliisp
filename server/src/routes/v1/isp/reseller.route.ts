import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import ispResellerValidation from '../../../validations/ispReseller.validation';
import ispResellerController from '../../../controllers/ispReseller.controller';

const router = express.Router();

router
  .route('/')
  .get(auth('manageResellers'), validate(ispResellerValidation.getResellers), ispResellerController.getResellers)
  .post(auth('manageResellers'), validate(ispResellerValidation.createReseller), ispResellerController.createReseller);

router
  .route('/:resellerId')
  .get(auth('manageResellers'), validate(ispResellerValidation.resellerId), ispResellerController.getResellerById)
  .patch(auth('manageResellers'), validate(ispResellerValidation.updateReseller), ispResellerController.updateReseller)
  .delete(auth('deleteReseller'), validate(ispResellerValidation.resellerId), ispResellerController.deleteReseller);

export default router;
