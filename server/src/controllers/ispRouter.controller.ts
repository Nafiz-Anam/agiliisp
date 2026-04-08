import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated, sendUpdated, sendDeleted } from '../utils/apiResponse';
import routerService from '../services/router.service';
import routerLogService from '../services/routerLog.service';
import mikrotikService from '../services/mikrotik.service';
import prisma from '../client';

const createRouter = catchAsync(async (req: Request, res: Response) => {
  const router = await routerService.createRouter(req.body);
  return sendCreated(res, { router }, 'Router created successfully', (req as any).requestId);
});

const getRouters = catchAsync(async (req: Request, res: Response) => {
  const result: any = await routerService.getRouters(req.query as any);
  return sendSuccess(
    res,
    { routers: result.data },
    'Routers retrieved successfully',
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

const getRouterById = catchAsync(async (req: Request, res: Response) => {
  const router = await routerService.getRouterById(req.params.routerId as string);
  return sendSuccess(res, router, 'Router retrieved successfully', undefined, (req as any).requestId);
});

const updateRouter = catchAsync(async (req: Request, res: Response) => {
  const router = await routerService.updateRouterById(req.params.routerId as string, req.body);
  return sendUpdated(res, { router }, 'Router updated successfully', (req as any).requestId);
});

const deleteRouter = catchAsync(async (req: Request, res: Response) => {
  await routerService.deleteRouterById(req.params.routerId as string);
  return sendDeleted(res, 'Router deleted successfully', (req as any).requestId);
});

const getRouterStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await routerService.getRouterStats(req.params.routerId as string);
  return sendSuccess(res, stats, 'Router stats retrieved successfully', undefined, (req as any).requestId);
});

const testConnection = catchAsync(async (req: Request, res: Response) => {
  const result = await routerService.testRouterConnection(req.params.routerId as string);
  return sendSuccess(res, result, 'Router connection test completed', undefined, (req as any).requestId);
});

const syncRouter = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const routerId = req.params.routerId as string;
  const [customers, packages] = await Promise.all([
    routerService.syncCustomersFromRouter(routerId, userId),
    routerService.syncPackagesFromRouter(routerId, userId),
  ]);
  return sendSuccess(
    res,
    { customers, packages },
    'Router sync completed',
    undefined,
    (req as any).requestId
  );
});

const getActiveConnections = catchAsync(async (req: Request, res: Response) => {
  const connections = await mikrotikService.getActiveConnections(req.params.routerId as string);
  return sendSuccess(res, connections, 'Active connections retrieved', undefined, (req as any).requestId);
});

const fetchLogs = catchAsync(async (req: Request, res: Response) => {
  const logs = await routerLogService.fetchLogsFromRouter(req.params.routerId as string);
  return sendSuccess(
    res,
    { saved: logs.length, logs },
    'Logs fetched successfully',
    undefined,
    (req as any).requestId
  );
});

const disconnectUser = catchAsync(async (req: Request, res: Response) => {
  await mikrotikService.disconnectActiveUser(req.params.routerId as string, req.body.connectionId as string);
  return sendSuccess(res, null, 'User disconnected successfully', undefined, (req as any).requestId);
});

const getSyncLogs = catchAsync(async (req: Request, res: Response) => {
  const limit = Number((req.query.limit as string) || 20);
  const syncs = await prisma.syncLog.findMany({
    where: { routerId: req.params.routerId as string },
    take: limit,
    orderBy: { startedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true } },
    },
  });
  return sendSuccess(res, { syncs }, 'Sync logs retrieved successfully', undefined, (req as any).requestId);
});

export default {
  createRouter,
  getRouters,
  getRouterById,
  updateRouter,
  deleteRouter,
  getRouterStats,
  testConnection,
  syncRouter,
  getActiveConnections,
  fetchLogs,
  disconnectUser,
  getSyncLogs,
};
