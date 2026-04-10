import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import customerNoteService from '../services/customerNote.service';

const addNote = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const note = await customerNoteService.addNote(req.params.customerId as string, userId, req.body.type, req.body.message, req.body.metadata);
  return sendCreated(res, { note }, 'Note added', (req as any).requestId);
});

const getNotes = catchAsync(async (req: Request, res: Response) => {
  const result: any = await customerNoteService.getNotes(req.params.customerId as string, req.query as any);
  return sendSuccess(res, { notes: result.data }, 'Notes retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const deleteNote = catchAsync(async (req: Request, res: Response) => {
  await customerNoteService.deleteNote(req.params.noteId as string);
  return sendSuccess(res, null, 'Note deleted', undefined, (req as any).requestId);
});

export default { addNote, getNotes, deleteNote };
