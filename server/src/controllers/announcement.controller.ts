import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import announcementService from '../services/announcement.service';

const create = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const announcement = await announcementService.createAnnouncement(req.body, userId);
  return sendCreated(res, { announcement }, 'Announcement created', (req as any).requestId);
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result: any = await announcementService.getAnnouncements(req.query as any);
  return sendSuccess(res, { announcements: result.data }, 'Announcements retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const announcement = await announcementService.getAnnouncementById(req.params.id as string);
  return sendSuccess(res, { announcement }, 'Announcement retrieved', undefined, (req as any).requestId);
});

const update = catchAsync(async (req: Request, res: Response) => {
  const announcement = await announcementService.updateAnnouncement(req.params.id as string, req.body);
  return sendSuccess(res, { announcement }, 'Announcement updated', undefined, (req as any).requestId);
});

const resolve = catchAsync(async (req: Request, res: Response) => {
  const announcement = await announcementService.resolveAnnouncement(req.params.id as string);
  return sendSuccess(res, { announcement }, 'Announcement resolved', undefined, (req as any).requestId);
});

const notify = catchAsync(async (req: Request, res: Response) => {
  await announcementService.notifyAffectedCustomers(req.params.id as string);
  return sendSuccess(res, null, 'Notifications sent', undefined, (req as any).requestId);
});

const getActive = catchAsync(async (_req: Request, res: Response) => {
  const announcements = await announcementService.getActiveAnnouncements();
  return sendSuccess(res, { announcements }, 'Active announcements', undefined, (_req as any).requestId);
});

export default { create, getAll, getById, update, resolve, notify, getActive };
