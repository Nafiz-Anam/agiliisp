import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import customerPortalService from '../services/customerPortal.service';
import exportService from '../services/export.service';

const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const data = await customerPortalService.getDashboard(userId);
  return sendSuccess(res, data, 'Dashboard retrieved', undefined, (req as any).requestId);
});

const getInvoices = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result: any = await customerPortalService.getMyInvoices(userId, req.query as any);
  return sendSuccess(res, { invoices: result.data }, 'Invoices retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getInvoiceById = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const invoice = await customerPortalService.getMyInvoiceById(userId, req.params.invoiceId as string);
  return sendSuccess(res, { invoice }, 'Invoice retrieved', undefined, (req as any).requestId);
});

const downloadInvoicePdf = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const invoice = await customerPortalService.getMyInvoiceById(userId, req.params.invoiceId as string);
  await exportService.generateInvoicePDF(invoice, res);
});

const getPayments = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result: any = await customerPortalService.getMyPayments(userId, req.query as any);
  return sendSuccess(res, { payments: result.data }, 'Payments retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getTickets = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result: any = await customerPortalService.getMyTickets(userId, req.query as any);
  return sendSuccess(res, { tickets: result.data }, 'Tickets retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getTicketById = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const ticket = await customerPortalService.getMyTicketById(userId, req.params.ticketId as string);
  return sendSuccess(res, { ticket }, 'Ticket retrieved', undefined, (req as any).requestId);
});

const createTicket = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const ticket = await customerPortalService.createMyTicket(userId, req.body);
  return sendCreated(res, { ticket }, 'Ticket created', (req as any).requestId);
});

const addTicketReply = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const reply = await customerPortalService.addMyTicketReply(userId, req.params.ticketId as string, req.body.message);
  return sendCreated(res, { reply }, 'Reply added', (req as any).requestId);
});

const getProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const profile = await customerPortalService.getMyProfile(userId);
  return sendSuccess(res, { profile }, 'Profile retrieved', undefined, (req as any).requestId);
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const profile = await customerPortalService.updateMyProfile(userId, req.body);
  return sendSuccess(res, { profile }, 'Profile updated', undefined, (req as any).requestId);
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  await customerPortalService.changePassword(userId, req.body.currentPassword, req.body.newPassword);
  return sendSuccess(res, null, 'Password changed successfully', undefined, (req as any).requestId);
});

const getTrafficStats = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const stats = await customerPortalService.getMyTrafficStats(userId, (req.query.period as string) || 'DAILY');
  return sendSuccess(res, { stats }, 'Traffic stats retrieved', undefined, (req as any).requestId);
});

export default {
  getDashboard, getInvoices, getInvoiceById, downloadInvoicePdf,
  getPayments, getTickets, getTicketById, createTicket, addTicketReply,
  getProfile, updateProfile, changePassword, getTrafficStats,
};
