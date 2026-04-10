import prisma from '../client';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';

const db = prisma as any;

const createZone = async (body: {
  name: string; parentId?: string; division?: string; district?: string;
  upazila?: string; area?: string; description?: string; coverage?: string;
}) => {
  return db.zone.create({ data: body });
};

const getZones = async (options: { parentId?: string; includeChildren?: boolean }) => {
  const where: any = {};
  if (options.parentId === 'root') where.parentId = null;
  else if (options.parentId) where.parentId = options.parentId;

  return db.zone.findMany({
    where,
    include: {
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true } },
      _count: { select: { customers: true, collectors: true } },
    },
    orderBy: { name: 'asc' },
  });
};

const getZoneById = async (id: string) => {
  const zone = await db.zone.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true } },
      children: { include: { _count: { select: { customers: true } } } },
      _count: { select: { customers: true, collectors: true } },
    },
  });
  if (!zone) throw new ApiError(httpStatus.NOT_FOUND, 'Zone not found');
  return zone;
};

const updateZone = async (id: string, body: any) => {
  await getZoneById(id);
  return db.zone.update({ where: { id }, data: body });
};

const deleteZone = async (id: string) => {
  const zone = await getZoneById(id);
  if (zone._count.customers > 0) throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete zone with assigned customers');
  return db.zone.delete({ where: { id } });
};

const getZoneTree = async () => {
  const zones = await db.zone.findMany({
    where: { isActive: true },
    include: { _count: { select: { customers: true, collectors: true } } },
    orderBy: { name: 'asc' },
  });

  // Build tree from flat list
  const map = new Map();
  const roots: any[] = [];
  zones.forEach((z: any) => map.set(z.id, { ...z, children: [] }));
  zones.forEach((z: any) => {
    if (z.parentId && map.has(z.parentId)) {
      map.get(z.parentId).children.push(map.get(z.id));
    } else {
      roots.push(map.get(z.id));
    }
  });
  return roots;
};

export default { createZone, getZones, getZoneById, updateZone, deleteZone, getZoneTree };
