import express from 'express';
import auth from '../../../middlewares/auth';
import bulkMessageController from '../../../controllers/bulkMessage.controller';

const router = express.Router();

router.route('/')
  .get(auth('manageCustomers'), bulkMessageController.getAll)
  .post(auth('manageCustomers'), bulkMessageController.create);

router.post('/preview', auth('manageCustomers'), bulkMessageController.preview);

router.get('/:id', auth('manageCustomers'), bulkMessageController.getById);
router.post('/:id/send', auth('manageCustomers'), bulkMessageController.send);

export default router;
