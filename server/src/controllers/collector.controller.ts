import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import collectorService from '../services/collector.service';

const createCollector = catchAsync(async (req: Request, res: Response) => {
  const collector = await collectorService.createCollector(req.body);
  return sendCreated(res, { collector }, 'Collector created', (req as any).requestId);
});

const getCollectors = catchAsync(async (req: Request, res: Response) => {
  const collectors = await collectorService.getCollectors(req.query as any);
  return sendSuccess(res, { collectors }, 'Collectors retrieved', undefined, (req as any).requestId);
});

const getCollectorById = catchAsync(async (req: Request, res: Response) => {
  const collector = await collectorService.getCollectorById(req.params.collectorId as string);
  return sendSuccess(res, { collector }, 'Collector retrieved', undefined, (req as any).requestId);
});

const updateCollector = catchAsync(async (req: Request, res: Response) => {
  const collector = await collectorService.updateCollector(req.params.collectorId as string, req.body);
  return sendSuccess(res, { collector }, 'Collector updated', undefined, (req as any).requestId);
});

const deleteCollector = catchAsync(async (req: Request, res: Response) => {
  await collectorService.deleteCollector(req.params.collectorId as string);
  return sendSuccess(res, null, 'Collector deleted', undefined, (req as any).requestId);
});

const recordCollection = catchAsync(async (req: Request, res: Response) => {
  const collection = await collectorService.recordCollection(req.body);
  return sendCreated(res, { collection }, 'Collection recorded', (req as any).requestId);
});

const getCollections = catchAsync(async (req: Request, res: Response) => {
  const result: any = await collectorService.getCollections(req.query as any);
  return sendSuccess(res, { collections: result.data }, 'Collections retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const reconcileCollection = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const collection = await collectorService.reconcileCollection(req.params.collectionId as string, userId);
  return sendSuccess(res, { collection }, 'Collection reconciled', undefined, (req as any).requestId);
});

const getCollectorSummary = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as any;
  const summary = await collectorService.getCollectorSummary(req.params.collectorId as string, startDate, endDate);
  return sendSuccess(res, { summary }, 'Summary retrieved', undefined, (req as any).requestId);
});

export default { createCollector, getCollectors, getCollectorById, updateCollector, deleteCollector, recordCollection, getCollections, reconcileCollection, getCollectorSummary };
