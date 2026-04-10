import express from 'express';
import auth from '../../../middlewares/auth';
import announcementController from '../../../controllers/announcement.controller';

const router = express.Router();

router.route('/')
  .get(auth('manageCustomers'), announcementController.getAll)
  .post(auth('manageCustomers'), announcementController.create);

router.get('/active', auth('manageCustomers'), announcementController.getActive);

router.route('/:id')
  .get(auth('manageCustomers'), announcementController.getById)
  .patch(auth('manageCustomers'), announcementController.update);

router.post('/:id/resolve', auth('manageCustomers'), announcementController.resolve);
router.post('/:id/notify', auth('manageCustomers'), announcementController.notify);

export default router;
