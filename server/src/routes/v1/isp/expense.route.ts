import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import expenseValidation from '../../../validations/expense.validation';
import expenseController from '../../../controllers/expense.controller';

const router = express.Router();

router.get('/summary', auth('manageInvoices'), validate(expenseValidation.summary), expenseController.getSummary);
router.get('/profit-loss', auth('manageInvoices'), validate(expenseValidation.profitLoss), expenseController.getProfitLoss);

router
  .route('/')
  .get(auth('manageInvoices'), validate(expenseValidation.getExpenses), expenseController.getExpenses)
  .post(auth('manageInvoices'), validate(expenseValidation.createExpense), expenseController.createExpense);

router
  .route('/:expenseId')
  .get(auth('manageInvoices'), validate(expenseValidation.expenseId), expenseController.getExpenseById)
  .patch(auth('manageInvoices'), validate(expenseValidation.updateExpense), expenseController.updateExpense)
  .delete(auth('manageInvoices'), validate(expenseValidation.expenseId), expenseController.deleteExpense);

export default router;
