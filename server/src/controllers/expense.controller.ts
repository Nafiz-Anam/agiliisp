import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import expenseService from '../services/expense.service';

const createExpense = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const expense = await expenseService.createExpense(req.body, userId);
  return sendCreated(res, { expense }, 'Expense created', (req as any).requestId);
});

const getExpenses = catchAsync(async (req: Request, res: Response) => {
  const result: any = await expenseService.getExpenses(req.query as any);
  return sendSuccess(res, { expenses: result.data }, 'Expenses retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getExpenseById = catchAsync(async (req: Request, res: Response) => {
  const expense = await expenseService.getExpenseById(req.params.expenseId as string);
  return sendSuccess(res, { expense }, 'Expense retrieved', undefined, (req as any).requestId);
});

const updateExpense = catchAsync(async (req: Request, res: Response) => {
  const expense = await expenseService.updateExpense(req.params.expenseId as string, req.body);
  return sendSuccess(res, { expense }, 'Expense updated', undefined, (req as any).requestId);
});

const deleteExpense = catchAsync(async (req: Request, res: Response) => {
  await expenseService.deleteExpense(req.params.expenseId as string);
  return sendSuccess(res, null, 'Expense deleted', undefined, (req as any).requestId);
});

const getSummary = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as any;
  const summary = await expenseService.getExpenseSummary(startDate, endDate);
  return sendSuccess(res, { summary }, 'Expense summary retrieved', undefined, (req as any).requestId);
});

const getProfitLoss = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as any;
  const report = await expenseService.getProfitLoss(startDate, endDate);
  return sendSuccess(res, { report }, 'P&L report retrieved', undefined, (req as any).requestId);
});

export default { createExpense, getExpenses, getExpenseById, updateExpense, deleteExpense, getSummary, getProfitLoss };
