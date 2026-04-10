import prisma from '../client';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import complianceLogService from './complianceLog.service';

const db = prisma as any;

// ── IP Math Utilities ──

const ipToLong = (ip: string): number => {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
};

const longToIp = (long: number): string => {
  return `${(long >>> 24) & 255}.${(long >>> 16) & 255}.${(long >>> 8) & 255}.${long & 255}`;
};

const getNetworkInfo = (network: string, cidr: number) => {
  const netLong = ipToLong(network);
  const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  const networkAddr = (netLong & mask) >>> 0;
  const broadcast = (networkAddr | (~mask >>> 0)) >>> 0;
  const totalIps = Math.pow(2, 32 - cidr);
  // Usable = total - network - broadcast (for /31 and /32, all are usable)
  const usableIps = cidr >= 31 ? totalIps : totalIps - 2;
  const firstUsable = cidr >= 31 ? networkAddr : networkAddr + 1;
  const lastUsable = cidr >= 31 ? broadcast : broadcast - 1;

  return {
    networkAddr: longToIp(networkAddr),
    broadcast: longToIp(broadcast),
    netmask: longToIp(mask),
    totalIps,
    usableIps,
    firstUsable: longToIp(firstUsable),
    lastUsable: longToIp(lastUsable),
    cidrNotation: `${longToIp(networkAddr)}/${cidr}`,
  };
};

const isIpInSubnet = (ip: string, network: string, cidr: number): boolean => {
  const ipLong = ipToLong(ip);
  const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  const netLong = ipToLong(network) & mask;
  return (ipLong & mask) === netLong;
};

const getAllUsableIps = (network: string, cidr: number): string[] => {
  const info = getNetworkInfo(network, cidr);
  const first = ipToLong(info.firstUsable);
  const last = ipToLong(info.lastUsable);
  const ips: string[] = [];
  for (let i = first; i <= last; i++) {
    ips.push(longToIp(i));
  }
  return ips;
};

// ── CRUD Operations ──

const createPool = async (body: {
  name: string; network: string; cidr: number; gateway?: string;
  dnsServers?: string; poolType?: string; routerId?: string;
  vlanId?: number; description?: string; syncToRouter?: boolean; mikrotikPool?: string;
}) => {
  const info = getNetworkInfo(body.network, body.cidr);

  // Check for overlapping subnets
  const existing = await db.ipPool.findMany({ where: { isActive: true } });
  for (const pool of existing) {
    // Check if any IP in the new range falls in an existing range or vice versa
    if (isIpInSubnet(info.firstUsable, pool.network, pool.cidr) ||
        isIpInSubnet(pool.network, body.network, body.cidr)) {
      throw new ApiError(httpStatus.CONFLICT, `Overlaps with existing pool "${pool.name}" (${pool.network}/${pool.cidr})`);
    }
  }

  return db.ipPool.create({
    data: {
      name: body.name,
      network: info.networkAddr, // normalize
      cidr: body.cidr,
      gateway: body.gateway || null,
      dnsServers: body.dnsServers || null,
      poolType: body.poolType || 'PPPOE',
      routerId: body.routerId || null,
      vlanId: body.vlanId || null,
      totalIps: info.usableIps,
      description: body.description || null,
      syncToRouter: body.syncToRouter || false,
      mikrotikPool: body.mikrotikPool || null,
    },
  });
};

const getPools = async (options: { routerId?: string; poolType?: string; isActive?: string }) => {
  const where: any = {};
  if (options.routerId) where.routerId = options.routerId;
  if (options.poolType) where.poolType = options.poolType;
  if (options.isActive !== undefined) where.isActive = options.isActive === 'true';

  const pools = await db.ipPool.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  // Enrich with calculated info
  return pools.map((p: any) => {
    const info = getNetworkInfo(p.network, p.cidr);
    return {
      ...p,
      ...info,
      usagePercent: p.totalIps > 0 ? Math.round(((p.usedIps + p.reservedIps) / p.totalIps) * 100) : 0,
    };
  });
};

const getPoolById = async (id: string) => {
  const pool = await db.ipPool.findUnique({
    where: { id },
    include: {
      assignments: {
        orderBy: { ipAddress: 'asc' },
        take: 500,
      },
    },
  });
  if (!pool) throw new ApiError(httpStatus.NOT_FOUND, 'IP Pool not found');

  const info = getNetworkInfo(pool.network, pool.cidr);
  return { ...pool, ...info, usagePercent: pool.totalIps > 0 ? Math.round(((pool.usedIps + pool.reservedIps) / pool.totalIps) * 100) : 0 };
};

const updatePool = async (id: string, body: any) => {
  await getPoolById(id);
  const updateData: any = {};
  if (body.name) updateData.name = body.name;
  if (body.gateway !== undefined) updateData.gateway = body.gateway;
  if (body.dnsServers !== undefined) updateData.dnsServers = body.dnsServers;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.poolType) updateData.poolType = body.poolType;
  if (body.routerId !== undefined) updateData.routerId = body.routerId;
  if (body.vlanId !== undefined) updateData.vlanId = body.vlanId;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.syncToRouter !== undefined) updateData.syncToRouter = body.syncToRouter;
  if (body.mikrotikPool !== undefined) updateData.mikrotikPool = body.mikrotikPool;

  return db.ipPool.update({ where: { id }, data: updateData });
};

const deletePool = async (id: string) => {
  const pool = await getPoolById(id);
  if (pool.usedIps > 0) throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete pool with active assignments');
  return db.ipPool.delete({ where: { id } });
};

// ── IP Assignment ──

const getNextAvailableIp = async (poolId: string): Promise<string | null> => {
  const pool = await db.ipPool.findUnique({ where: { id: poolId } });
  if (!pool) throw new ApiError(httpStatus.NOT_FOUND, 'Pool not found');

  const allUsable = getAllUsableIps(pool.network, pool.cidr);

  // Get all currently assigned/reserved IPs in this pool
  const assigned = await db.ipAssignment.findMany({
    where: { poolId, status: { in: ['ACTIVE', 'RESERVED'] } },
    select: { ipAddress: true },
  });
  const usedSet = new Set(assigned.map((a: any) => a.ipAddress));

  // Also exclude gateway
  if (pool.gateway) usedSet.add(pool.gateway);

  // Find first available
  for (const ip of allUsable) {
    if (!usedSet.has(ip)) return ip;
  }

  return null;
};

const assignIp = async (poolId: string, body: { ipAddress?: string; customerId?: string; description?: string; status?: string }) => {
  const pool = await db.ipPool.findUnique({ where: { id: poolId } });
  if (!pool) throw new ApiError(httpStatus.NOT_FOUND, 'Pool not found');

  let ip = body.ipAddress;
  if (!ip) {
    ip = await getNextAvailableIp(poolId);
    if (!ip) throw new ApiError(httpStatus.CONFLICT, 'No available IPs in this pool');
  }

  // Validate IP is in subnet
  if (!isIpInSubnet(ip, pool.network, pool.cidr)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `IP ${ip} is not within subnet ${pool.network}/${pool.cidr}`);
  }

  // Check for duplicates
  const existing = await db.ipAssignment.findFirst({
    where: { poolId, ipAddress: ip, status: { in: ['ACTIVE', 'RESERVED'] } },
  });
  if (existing) throw new ApiError(httpStatus.CONFLICT, `IP ${ip} is already assigned`);

  // Check global duplicate (across all pools)
  if (body.customerId) {
    const globalDup = await db.ipAssignment.findFirst({
      where: { ipAddress: ip, status: 'ACTIVE', poolId: { not: poolId } },
    });
    if (globalDup) throw new ApiError(httpStatus.CONFLICT, `IP ${ip} is already in use in another pool`);
  }

  const assignment = await db.ipAssignment.create({
    data: {
      poolId,
      ipAddress: ip,
      customerId: body.customerId || null,
      status: body.status || 'ACTIVE',
      description: body.description || null,
    },
  });

  // Update pool counts
  const status = body.status || 'ACTIVE';
  await db.ipPool.update({
    where: { id: poolId },
    data: status === 'RESERVED'
      ? { reservedIps: { increment: 1 } }
      : { usedIps: { increment: 1 } },
  });

  // Update customer's IP if customerId provided
  if (body.customerId) {
    try {
      await prisma.ispCustomer.update({ where: { id: body.customerId }, data: { ipAddress: ip } });
    } catch {}
  }

  // Compliance: log IP assignment
  if (pool.routerId) {
    const customer = body.customerId ? await prisma.ispCustomer.findUnique({ where: { id: body.customerId }, select: { username: true } }) : null;
    complianceLogService.logNat({
      customerId: body.customerId, username: customer?.username || 'manual',
      assignedIp: ip, routerId: pool.routerId, action: 'ASSIGN',
    }).catch(() => {});
  }

  return { assignment, ipAddress: ip };
};

const releaseIp = async (assignmentId: string) => {
  const assignment = await db.ipAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found');

  await db.ipAssignment.update({
    where: { id: assignmentId },
    data: { status: 'RELEASED', releasedAt: new Date() },
  });

  // Decrement pool count
  const pool = await db.ipPool.findUnique({ where: { id: assignment.poolId }, select: { routerId: true } });
  await db.ipPool.update({
    where: { id: assignment.poolId },
    data: assignment.status === 'RESERVED'
      ? { reservedIps: { decrement: 1 } }
      : { usedIps: { decrement: 1 } },
  });

  // Compliance: log IP release
  if (pool?.routerId) {
    const customer = assignment.customerId ? await prisma.ispCustomer.findUnique({ where: { id: assignment.customerId }, select: { username: true } }) : null;
    complianceLogService.logNat({
      customerId: assignment.customerId, username: customer?.username || 'manual',
      assignedIp: assignment.ipAddress, routerId: pool.routerId, action: 'RELEASE',
    }).catch(() => {});
  }

  return { success: true };
};

const getPoolAssignments = async (poolId: string, options: { status?: string; page?: number; limit?: number }) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 50;
  const where: any = { poolId };
  if (options.status) where.status = options.status;

  const [assignments, total] = await Promise.all([
    db.ipAssignment.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { ipAddress: 'asc' },
    }),
    db.ipAssignment.count({ where }),
  ]);

  return { data: assignments, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

// ── Auto-assign for customer creation ──

const autoAssignIp = async (routerId: string, customerId: string): Promise<string | null> => {
  // Find a pool linked to this router with available IPs
  const pools = await db.ipPool.findMany({
    where: { routerId, isActive: true, poolType: { in: ['PPPOE', 'DHCP', 'STATIC'] } },
    orderBy: { usedIps: 'asc' }, // prefer least-used pool
  });

  for (const pool of pools) {
    if (pool.usedIps + pool.reservedIps < pool.totalIps) {
      const result = await assignIp(pool.id, { customerId });
      return result.ipAddress;
    }
  }

  return null; // no available pools
};

export default {
  // Utilities
  getNetworkInfo, isIpInSubnet, ipToLong, longToIp,
  // CRUD
  createPool, getPools, getPoolById, updatePool, deletePool,
  // Assignment
  getNextAvailableIp, assignIp, releaseIp, getPoolAssignments, autoAssignIp,
};
