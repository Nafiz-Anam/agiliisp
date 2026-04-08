import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated, sendUpdated } from '../utils/apiResponse';
import ticketService from '../services/ticket.service';

const createTicket = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const ticket = await ticketService.createTicket(req.body, userId);
  return sendCreated(res, { ticket }, 'Ticket created successfully', (req as any).requestId);
});

const getTickets = catchAsync(async (req: Request, res: Response) => {
  const result: any = await ticketService.getTickets(req.query as any);
  return sendSuccess(
    res,
    { tickets: result.data },
    'Tickets retrieved successfully',
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

const getTicketById = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketService.getTicketById(req.params.ticketId as string);
  return sendSuccess(res, ticket, 'Ticket retrieved successfully', undefined, (req as any).requestId);
});

const updateTicket = catchAsync(async (req: Request, res: Response) => {
  const ticket = await ticketService.updateTicketById(req.params.ticketId as string, req.body);
  return sendUpdated(res, { ticket }, 'Ticket updated successfully', (req as any).requestId);
});

const addReply = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { message, isInternal = false } = req.body;
  const reply = await ticketService.addReply(req.params.ticketId as string, userId, message, isInternal);
  return sendCreated(res, { reply }, 'Reply added successfully', (req as any).requestId);
});

export default { createTicket, getTickets, getTicketById, updateTicket, addReply };
