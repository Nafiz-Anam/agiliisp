import { z } from 'zod';

const getRouterLogs = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    routerId: z.string().optional(),
    customerId: z.string().optional(),
    logType: z.enum(['SYSTEM', 'PPPOE', 'FIREWALL', 'DHCP', 'DNS', 'HOTSPOT', 'WIRELESS', 'TRAFFIC']).optional(),
    severity: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
    isProcessed: z.string().optional(),
    sortBy: z.enum(['timestamp', 'severity', 'logType', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).default({}),
};

export default { getRouterLogs };
