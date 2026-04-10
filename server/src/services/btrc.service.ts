import prisma from '../client';

const getSubscriberReport = async () => {
  const [total, active, suspended, terminated, pending] = await Promise.all([
    prisma.ispCustomer.count(),
    prisma.ispCustomer.count({ where: { status: 'ACTIVE' } }),
    prisma.ispCustomer.count({ where: { status: 'SUSPENDED' } }),
    prisma.ispCustomer.count({ where: { status: 'TERMINATED' } }),
    prisma.ispCustomer.count({ where: { status: 'PENDING_ACTIVATION' } }),
  ]);

  // By connection type
  const byConnectionType = await prisma.ispCustomer.groupBy({
    by: ['connectionType'],
    _count: true,
  });

  // By package
  const byPackage = await prisma.ispCustomer.groupBy({
    by: ['packageId'],
    _count: true,
    where: { status: 'ACTIVE' },
  });

  const packages = await prisma.internetPackage.findMany({
    select: { id: true, name: true, downloadSpeed: true, uploadSpeed: true },
  });
  const pkgMap = new Map(packages.map(p => [p.id, p]));

  // Monthly new subscribers (last 12 months)
  const monthlyNew: any[] = await prisma.$queryRaw`
    SELECT date_trunc('month', created_at) AS month, COUNT(*)::int AS count
    FROM isp_customers
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY month ORDER BY month ASC
  `;

  return {
    total, active, suspended, terminated, pending,
    byConnectionType: byConnectionType.map(r => ({ type: r.connectionType, count: r._count })),
    byPackage: byPackage.map(r => {
      const pkg = pkgMap.get(r.packageId);
      return { packageId: r.packageId, name: pkg?.name || '—', speed: pkg ? `${pkg.downloadSpeed}/${pkg.uploadSpeed}` : '—', count: r._count };
    }),
    monthlyNewSubscribers: monthlyNew.map(r => ({ month: r.month, count: Number(r.count) })),
    reportDate: new Date(),
  };
};

const getBandwidthReport = async (startDate?: string, endDate?: string) => {
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);
  const periodFilter = Object.keys(dateFilter).length ? { periodStart: dateFilter } : {};

  // Total bandwidth consumed
  const trafficAgg = await prisma.trafficStat.aggregate({
    where: { periodType: 'DAILY', ...periodFilter },
    _sum: { totalBytesIn: true, totalBytesOut: true },
  });

  // Daily bandwidth trend
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
  const end = endDate ? new Date(endDate) : new Date();
  const dailyTrend: any[] = await prisma.$queryRaw`
    SELECT period_start::date AS day,
           SUM(total_bytes_in)::bigint AS bytes_in,
           SUM(total_bytes_out)::bigint AS bytes_out
    FROM traffic_stats
    WHERE period_type = 'DAILY'
      AND period_start >= ${start}
      AND period_start <= ${end}
    GROUP BY day ORDER BY day ASC
  `;

  // Per-package bandwidth
  const byPackage: any[] = await prisma.$queryRaw`
    SELECT p.name AS package_name, p.download_speed, p.upload_speed,
           COUNT(DISTINCT c.id)::int AS subscribers,
           COALESCE(SUM(t.total_bytes_in), 0)::bigint AS total_in,
           COALESCE(SUM(t.total_bytes_out), 0)::bigint AS total_out
    FROM internet_packages p
    JOIN isp_customers c ON c.package_id = p.id AND c.status = 'ACTIVE'
    LEFT JOIN traffic_stats t ON t.customer_id = c.id AND t.period_type = 'DAILY'
    GROUP BY p.id, p.name, p.download_speed, p.upload_speed
    ORDER BY total_in DESC
  `;

  return {
    totalBytesIn: Number(trafficAgg._sum.totalBytesIn || 0),
    totalBytesOut: Number(trafficAgg._sum.totalBytesOut || 0),
    dailyTrend: dailyTrend.map(r => ({
      day: r.day,
      bytesIn: Number(r.bytes_in || 0),
      bytesOut: Number(r.bytes_out || 0),
    })),
    byPackage: byPackage.map(r => ({
      packageName: r.package_name,
      speed: `${r.download_speed}/${r.upload_speed} Mbps`,
      subscribers: Number(r.subscribers),
      totalIn: Number(r.total_in || 0),
      totalOut: Number(r.total_out || 0),
    })),
    reportDate: new Date(),
  };
};

const getConnectionLogReport = async (options: { page?: number; limit?: number; startDate?: string; endDate?: string }) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 50;

  const where: any = { periodType: 'DAILY' };
  if (options.startDate || options.endDate) {
    where.periodStart = {};
    if (options.startDate) where.periodStart.gte = new Date(options.startDate);
    if (options.endDate) where.periodStart.lte = new Date(options.endDate);
  }

  const [logs, total] = await Promise.all([
    prisma.trafficStat.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { periodStart: 'desc' },
      include: { customer: { select: { id: true, fullName: true, username: true, ipAddress: true } } },
    }),
    prisma.trafficStat.count({ where }),
  ]);

  return {
    data: logs.map(l => ({
      customerId: l.customerId,
      customerName: (l as any).customer?.fullName,
      username: (l as any).customer?.username,
      ipAddress: (l as any).customer?.ipAddress,
      date: l.periodStart,
      bytesIn: Number(l.totalBytesIn),
      bytesOut: Number(l.totalBytesOut),
      sessionsCount: l.sessionsCount,
      onlineTime: l.totalOnlineTime ? Number(l.totalOnlineTime) : 0,
    })),
    meta: { page, limit, totalPages: Math.ceil(total / limit), total },
  };
};

export default { getSubscriberReport, getBandwidthReport, getConnectionLogReport };
