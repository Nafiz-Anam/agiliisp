import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import invoiceService from '../services/invoice.service';
import exportService from '../services/export.service';

const createInvoice = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const invoice = await invoiceService.createInvoice(req.body, userId);
  return sendCreated(res, { invoice }, 'Invoice created successfully', (req as any).requestId);
});

const getInvoices = catchAsync(async (req: Request, res: Response) => {
  const result: any = await invoiceService.getInvoices(req.query as any);
  return sendSuccess(
    res,
    { invoices: result.data },
    'Invoices retrieved successfully',
    undefined,
    (req as any).requestId,
    {
      page: result.meta.page,
      limit: result.meta.limit,
      totalPages: result.meta.totalPages,
      totalResults: result.meta.total,
      hasNext: result.meta.page < result.meta.totalPages,
      hasPrev: result.meta.page > 1,
    }
  );
});

const getInvoiceById = catchAsync(async (req: Request, res: Response) => {
  const invoice = await invoiceService.getInvoiceById(req.params.invoiceId as string);
  return sendSuccess(res, { invoice }, 'Invoice retrieved successfully', undefined, (req as any).requestId);
});

const addPayment = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const payment = await invoiceService.addPayment(req.params.invoiceId as string, req.body, userId);
  return sendCreated(res, { payment }, 'Payment recorded successfully', (req as any).requestId);
});

const autoGenerateInvoices = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const dueDate = new Date(req.body.dueDate);
  const result = await invoiceService.autoGenerateInvoices(dueDate, userId);
  return sendSuccess(
    res,
    { created: result.created },
    `Auto-generated ${result.created} invoices`,
    undefined,
    (req as any).requestId
  );
});

const getBillingDashboard = catchAsync(async (req: Request, res: Response) => {
  const data = await invoiceService.getBillingDashboard();
  return sendSuccess(res, data, 'Billing dashboard retrieved', undefined, (req as any).requestId);
});

const getPayments = catchAsync(async (req: Request, res: Response) => {
  const result: any = await invoiceService.getPayments(req.query as any);
  return sendSuccess(
    res,
    { payments: result.data },
    'Payments retrieved',
    undefined,
    (req as any).requestId,
    {
      page: result.meta.page,
      limit: result.meta.limit,
      totalPages: result.meta.totalPages,
      totalResults: result.meta.total,
      hasNext: result.meta.page < result.meta.totalPages,
      hasPrev: result.meta.page > 1,
    }
  );
});

const markInvoiceSent = catchAsync(async (req: Request, res: Response) => {
  const invoice = await invoiceService.markInvoiceSent(req.params.invoiceId as string);
  return sendSuccess(res, { invoice }, 'Invoice marked as sent', undefined, (req as any).requestId);
});

const downloadInvoicePDF = catchAsync(async (req: Request, res: Response) => {
  const invoice = await invoiceService.getInvoiceById(req.params.invoiceId as string);
  await exportService.generateInvoicePDF(invoice, res);
});

const bulkSendInvoices = catchAsync(async (req: Request, res: Response) => {
  const result = await invoiceService.bulkSendInvoices(req.body.ids);
  return sendSuccess(res, result, `Bulk send: ${result.success} sent, ${result.failed} failed`, undefined, (req as any).requestId);
});

export default { createInvoice, getInvoices, getInvoiceById, addPayment, autoGenerateInvoices, getBillingDashboard, getPayments, markInvoiceSent, downloadInvoicePDF, bulkSendInvoices };
