// =============================================
// Auth & User
// =============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN' | 'MODERATOR' | 'SUPER_ADMIN' | 'RESELLER' | 'CUSTOMER';
  isActive: boolean;
  createdAt: string;
}

// =============================================
// ISP Core Types
// =============================================

export type CustomerStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'PENDING_ACTIVATION';
export type ConnectionType = 'PPPOE' | 'HOTSPOT' | 'STATIC' | 'DHCP';
export type RouterStatus = 'ONLINE' | 'OFFLINE' | 'WARNING' | 'MAINTENANCE';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHECK' | 'ONLINE_PAYMENT' | 'AGENT_COLLECTED';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SyncStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';

export interface Router {
  id: string;
  name: string;
  host: string;
  port: number;
  useSSL: boolean;
  username: string;
  apiVersion: string | null;
  status: RouterStatus;
  lastConnectedAt: string | null;
  lastSyncAt: string | null;
  syncEnabled: boolean;
  location: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { customers: number; packages: number };
}

export interface InternetPackage {
  id: string;
  name: string;
  mikrotikId: string | null;
  routerId: string;
  downloadSpeed: number;
  uploadSpeed: number;
  dataLimit: number | null;
  burstDownload: number | null;
  burstUpload: number | null;
  priority: number;
  price: number;
  costPrice: number | null;
  description: string | null;
  isActive: boolean;
  isPublic: boolean;
  syncEnabled: boolean;
  createdAt: string;
  router: { id: string; name: string };
  _count?: { customers: number };
}

export interface Reseller {
  id: string;
  userId: string;
  businessName: string;
  businessRegistration: string | null;
  taxId: string | null;
  commissionRate: number;
  creditLimit: number | null;
  currentBalance: number;
  markupPercentage: number;
  canCreatePackages: boolean;
  canCreateCustomers: boolean;
  supportPhone: string | null;
  supportEmail: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
  _count?: { customers: number };
}

export interface IspCustomer {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: CustomerStatus;
  connectionType: ConnectionType;
  ipAddress: string | null;
  macAddress: string | null;
  isOnline: boolean;
  lastOnlineAt: string | null;
  installationDate: string | null;
  nextBillingDate: string | null;
  dataUsed: string;
  dataLimit: string | null;
  address: string | null;
  city: string | null;
  billingCycle: number;
  createdAt: string;
  router: { id: string; name: string };
  package: { id: string; name: string; downloadSpeed: number; uploadSpeed: number; price: number };
  reseller: { id: string; businessName: string } | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  resellerId: string | null;
  status: InvoiceStatus;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  invoiceDate: string;
  dueDate: string;
  paidDate: string | null;
  notes: string | null;
  createdAt: string;
  customer: { id: string; fullName: string; username: string };
  reseller: { id: string; businessName: string } | null;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Payment {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  status: PaymentStatus;
  reference: string | null;
  notes: string | null;
  customer: { id: string; fullName: string; username: string };
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  openedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  customer: { id: string; fullName: string; username: string };
  assignee: { id: string; name: string | null } | null;
  _count?: { replies: number };
}

export interface SyncLog {
  id: string;
  status: SyncStatus;
  startedAt: string;
  completedAt: string | null;
  totalRecords: number;
  syncedRecords: number;
  failedRecords: number;
  router: { name: string };
  user: { name: string | null } | null;
}

// =============================================
// Dashboard
// =============================================

export interface IspDashboardStats {
  stats: {
    customers: {
      total: number;
      active: number;
      suspended: number;
      online: number;
      offline: number;
    };
    routers: {
      total: number;
      online: number;
      offline: number;
    };
    finances: {
      totalRevenue30Days: number;
      totalCollected30Days: number;
      outstandingAmount: number;
      pendingInvoices: number;
      overdueInvoices: number;
    };
    tickets: { open: number };
    packages: { total: number };
    resellers: { total: number };
  };
  recentSyncs: SyncLog[];
  recentCustomers: {
    id: string;
    username: string;
    fullName: string;
    status: CustomerStatus;
    createdAt: string;
  }[];
}

export interface SystemStats {
  revenueByMonth: Record<string, number>;
  customersByMonth: Record<string, number>;
  packageStats: { package: string; count: number }[];
}

// =============================================
// Shared
// =============================================

export interface PaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta: {
    timestamp: string;
    requestId: string;
    pagination?: PaginationMeta;
  };
}

export interface AuthTokens {
  access: { token: string; expires: string };
  refresh: { token: string; expires: string };
}
