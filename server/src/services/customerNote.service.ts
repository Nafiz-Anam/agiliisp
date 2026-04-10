import prisma from '../client';
import logger from '../config/logger';

const db = prisma as any;

const addNote = async (customerId: string, userId: string | null, type: string, message: string, metadata?: any) => {
  return db.customerNote.create({
    data: { customerId, userId, type, message, metadata },
    include: { user: { select: { id: true, name: true } } },
  });
};

const addSystemNote = async (customerId: string, message: string, metadata?: any) => {
  return db.customerNote.create({
    data: { customerId, type: 'SYSTEM', message, metadata },
  }).catch((err: any) => logger.error(`Failed to add system note: ${err.message}`));
};

const getNotes = async (customerId: string, options: { page?: number; limit?: number; type?: string }) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 30;
  const where: any = { customerId };
  if (options.type) where.type = options.type;

  const [notes, total] = await Promise.all([
    db.customerNote.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    }),
    db.customerNote.count({ where }),
  ]);

  return { data: notes, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

const deleteNote = async (noteId: string) => {
  return db.customerNote.delete({ where: { id: noteId } });
};

export default { addNote, addSystemNote, getNotes, deleteNote };
