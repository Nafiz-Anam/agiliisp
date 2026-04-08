import httpStatus from 'http-status';
import { InvoiceStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError';
import prisma from '../client';

const generateInvoiceNumber = async (): Promise<string> => {
  const count = await prisma.invoice.count();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};

const createInvoice = async (
  body: {
    customerId: string;
    dueDate: string | Date;
    items: { description: string; packageId?: string; quantity: number; unitPrice: number }[];
    notes?: string;
    taxAmount?: number;
    discountAmount?: number;
  },
  createdByUserId?: string
) => {
  const customer = await prisma.ispCustomer.findUnique({
    where: { id: body.customerId },
    include: { reseller: true },
  });
  if (!customer) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');

  const subtotal = body.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = body.taxAmount ?? 0;
  const discountAmount = body.discountAmount ?? 0;
  const totalAmount = subtotal + taxAmount - discountAmount;

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId: body.customerId,
      resellerId: customer.resellerId ?? undefined,
      subtotal: new Prisma.Decimal(subtotal),
      taxAmount: new Prisma.Decimal(taxAmount),
      discountAmount: new Prisma.Decimal(discountAmount),
      totalAmount: new Prisma.Decimal(totalAmount),
      paidAmount: new Prisma.Decimal(0),
      balanceDue: new Prisma.Decimal(totalAmount),
      dueDate: new Date(body.dueDate),
      status: InvoiceStatus.SENT,
      notes: body.notes,
      createdBy: createdByUserId,
      items: {
        create: body.items.map((item) => ({
          description: item.description,
          packageId: item.packageId,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          totalPrice: new Prisma.Decimal(item.quantity * item.unitPrice),
        })),
      },
    },
    include: {
      items: true,
      customer: { select: { id: true, fullName: true, username: true } },
    },
  });

  return invoice;
};

const getInvoices = async (options: {
  page?: number;
  limit?: number;
  customerId?: string;
  resellerId?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const {
    customerId,
    resellerId,
    status,
    startDate,
    endDate,
    search,
    sortBy = 'invoiceDate',
    sortOrder = 'desc',
  } = options;
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;

  const where: Prisma.InvoiceWhereInput = {};

  if (customerId) where.customerId = customerId;
  if (resellerId) where.resellerId = resellerId;
  if (status) where.status = status;
  if (startDate) where.invoiceDate = { gte: new Date(startDate) };
  if (endDate) {
    where.invoiceDate = {
      ...(where.invoiceDate as object),
      lte: new Date(endDate),
    };
  }
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { customer: { fullName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const skip = (page - 1) * limit;
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: { select: { id: true, fullName: true, username: true, email: true } },
        reseller: { select: { id: true, businessName: true } },
        items: true,
        payments: true,
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    data: invoices,
    meta: { page, limit, totalPages: Math.ceil(total / limit), total },
  };
};

const getInvoiceById = async (id: string) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, fullName: true, username: true, email: true, phone: true } },
      reseller: { select: { id: true, businessName: true } },
      items: true,
      payments: true,
    },
  });
  if (!invoice) throw new ApiError(httpStatus.NOT_FOUND, 'Invoice not found');
  return invoice;
};

const updateInvoiceById = async (
  id: string,
  body: { status?: InvoiceStatus; notes?: string; dueDate?: string | Date }
) => {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new ApiError(httpStatus.NOT_FOUND, 'Invoice not found');

  return prisma.invoice.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.dueDate && { dueDate: new Date(body.dueDate) }),
    },
  });
};

const addPayment = async (
  invoiceId: string,
  paymentBody: {
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    notes?: string;
  },
  createdByUserId?: string
) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true },
  });
  if (!invoice) throw new ApiError(httpStatus.NOT_FOUND, 'Invoice not found');

  const newPaidAmount = Number(invoice.paidAmount) + paymentBody.amount;
  const newBalanceDue = Number(invoice.totalAmount) - newPaidAmount;

  let newStatus: InvoiceStatus;
  if (newBalanceDue <= 0) {
    newStatus = InvoiceStatus.PAID;
  } else if (newPaidAmount > 0) {
    newStatus = InvoiceStatus.PARTIALLY_PAID;
  } else {
    newStatus = invoice.status;
  }

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId,
        customerId: invoice.customerId,
        resellerId: invoice.resellerId ?? undefined,
        amount: new Prisma.Decimal(paymentBody.amount),
        paymentMethod: paymentBody.paymentMethod,
        status: PaymentStatus.COMPLETED,
        referenceNumber: paymentBody.referenceNumber,
        notes: paymentBody.notes,
        createdBy: createdByUserId,
      },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: new Prisma.Decimal(newPaidAmount),
        balanceDue: new Prisma.Decimal(Math.max(0, newBalanceDue)),
        status: newStatus,
        ...(newStatus === InvoiceStatus.PAID && { paidDate: new Date() }),
      },
    }),
  ]);

  return payment;
};

const autoGenerateInvoices = async (dueDate: Date, createdBy?: string) => {
  const customers = await prisma.ispCustomer.findMany({
    where: { status: 'ACTIVE' },
    include: { package: true, reseller: true },
  });

  let created = 0;
  for (const customer of customers) {
    try {
      const price = customer.customPrice
        ? Number(customer.customPrice)
        : Number(customer.package.price);

      await createInvoice(
        {
          customerId: customer.id,
          dueDate,
          items: [
            {
              description: `Internet service - ${customer.package.name}`,
              packageId: customer.packageId,
              quantity: 1,
              unitPrice: price,
            },
          ],
        },
        createdBy
      );
      created++;
    } catch {
      // Skip customers that fail (e.g., duplicate invoice)
    }
  }

  return { created };
};

export default {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceById,
  addPayment,
  autoGenerateInvoices,
};
