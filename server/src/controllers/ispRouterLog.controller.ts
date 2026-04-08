import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess } from '../utils/apiResponse';
import routerLogService from '../services/routerLog.service';

const getRouterLogs = catchAsync(async (req: Request, res: Response) => {
  const q = req.query as any;
  const options: any = {
    routerId: q.routerId as string | undefined,
    customerId: q.customerId as string | undefined,
    logType: q.logType as string | undefined,
    severity: q.severity as string | undefined,
    search: q.search as string | undefined,
    isProcessed: q.isProcessed !== undefined ? q.isProcessed === 'true' : undefined,
    startDate: q.startDate ? new Date(q.startDate as string) : undefined,
    endDate: q.endDate ? new Date(q.endDate as string) : undefined,
    page: q.page ? Number(q.page) : undefined,
    limit: q.limit ? Number(q.limit) : undefined,
    sortBy: q.sortBy as string | undefined,
    sortOrder: q.sortOrder as 'asc' | 'desc' | undefined,
  };

  const result: any = await routerLogService.getRouterLogs(options);
  return sendSuccess(
    res,
    { logs: result.data },
    'Router logs retrieved successfully',
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

export default { getRouterLogs };
