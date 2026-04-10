// =============================================
// Auth & User
// =============================================

export interface User {
    id: string;
    email: string;
    name: string | null;
    role:
        | "USER"
        | "ADMIN"
        | "MODERATOR"
        | "SUPER_ADMIN"
        | "MANAGER"
        | "SUPPORT"
        | "FIELD_TECHNICIAN"
        | "ENGINEER"
        | "RESELLER"
        | "CUSTOMER";
    isActive: boolean;
    createdAt: string;
}

// =============================================
// ISP Core Types
// =============================================

export type CustomerStatus =
    | "ACTIVE"
    | "SUSPENDED"
    | "TERMINATED"
    | "PENDING_ACTIVATION";
export type ConnectionType = "PPPOE" | "HOTSPOT" | "STATIC" | "DHCP";
export type RouterStatus = "ONLINE" | "OFFLINE" | "WARNING" | "MAINTENANCE";
export type InvoiceStatus =
    | "DRAFT"
    | "SENT"
    | "PARTIALLY_PAID"
    | "PAID"
    | "OVERDUE"
    | "CANCELLED"
    | "REFUNDED";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type PaymentMethod =
    | "CASH"
    | "BANK_TRANSFER"
    | "MOBILE_MONEY"
    | "CREDIT_CARD"
    | "DEBIT_CARD"
    | "CHECK"
    | "ONLINE_PAYMENT"
    | "AGENT_COLLECTED";
export type TicketStatus =
    | "OPEN"
    | "IN_PROGRESS"
    | "PENDING_CUSTOMER"
    | "RESOLVED"
    | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SyncStatus =
    | "PENDING"
    | "IN_PROGRESS"
    | "SUCCESS"
    | "PARTIAL_SUCCESS"
    | "FAILED";

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
    companyLogo: string | null;
    businessRegistrationUrl: string | null;
    tinDocumentUrl: string | null;
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
    nidNumber: string | null;
    nidFrontUrl: string | null;
    nidBackUrl: string | null;
    agreementUrl: string | null;
    profileImageUrl: string | null;
    createdAt: string;
    router: { id: string; name: string };
    package: {
        id: string;
        name: string;
        downloadSpeed: number;
        uploadSpeed: number;
        price: number;
    };
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

// =============================================
// RBAC Types
// =============================================

export interface Permission {
    id: string;
    name: string;
    description: string | null;
    resource: string;
    action: string;
    createdAt: string;
}

export interface RolePermissionLink {
    id: string;
    roleId: string;
    permissionId: string;
    permission: Permission;
}

export interface RoleModel {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    permissions: RolePermissionLink[];
}

// =============================================
// Billing Dashboard Types
// =============================================

export interface BillingDashboard {
    revenueThisMonth: number;
    revenueLastMonth: number;
    totalOutstanding: number;
    outstandingCount: number;
    overdueCount: number;
    overdueAmount: number;
    overdueInvoices: (Invoice & { customer: { id: string; fullName: string; username: string } })[];
    suspendedCustomers: number;
    collectionRate: number;
    totalInvoicesGenerated: number;
    totalInvoicesPaid: number;
    upcomingInvoices: (Invoice & { customer: { id: string; fullName: string; username: string } })[];
    recentPayments: (Payment & { invoiceNumber: string | null })[];
    atRiskCustomers: { id: string; fullName: string; username: string; autoSuspendDays: number }[];
}

// =============================================
// Inventory Types
// =============================================

export type InventoryCategory = "ROUTER" | "ONU" | "CABLE" | "SPLITTER" | "PATCH_CORD" | "CONNECTOR" | "TOOL" | "OTHER";
export type TransactionType = "PURCHASE_IN" | "DEPLOY_OUT" | "RETURN_IN" | "DAMAGE" | "REPAIR_SEND" | "REPAIR_RETURN" | "ADJUSTMENT" | "SALE" | "DECOMMISSION";
export type ItemCondition = "NEW" | "GOOD" | "FAIR" | "DAMAGED" | "DEFECTIVE" | "DECOMMISSIONED";
export type PurchaseOrderStatus = "DRAFT" | "PENDING" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export interface InventoryItemCategory {
    id: string;
    name: string;
    description: string | null;
}

export interface InventoryItem {
    id: string;
    name: string;
    sku: string;
    categoryId: string;
    category?: InventoryItemCategory;
    brand: string | null;
    model: string | null;
    description: string | null;
    unitCost: number;
    sellingPrice: number | null;
    minStockThreshold: number;
    totalQuantity: number;
    inStockCount: number;
    deployedCount: number;
    damagedCount: number;
    inRepairCount: number;
    isActive: boolean;
    createdAt: string;
}

export interface InventoryTransaction {
    id: string;
    itemId: string;
    type: TransactionType;
    quantity: number;
    previousQty: number;
    newQty: number;
    condition: ItemCondition;
    reference: string | null;
    notes: string | null;
    createdAt: string;
    performer: { id: string; name: string | null } | null;
    customer: { id: string; fullName: string; username: string } | null;
}

export interface PurchaseOrder {
    id: string;
    orderNumber: string;
    supplier: string;
    supplierContact: string | null;
    supplierEmail: string | null;
    status: PurchaseOrderStatus;
    orderDate: string;
    expectedDate: string | null;
    receivedDate: string | null;
    totalAmount: number;
    notes: string | null;
    createdAt: string;
    items: PurchaseOrderItem[];
    _count?: { items: number };
}

export interface PurchaseOrderItem {
    id: string;
    inventoryItemId: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    receivedQuantity: number;
    inventoryItem: { id: string; name: string; sku: string };
}

export interface InventoryDashboard {
    totalItems: number;
    totalInStock: number;
    totalDeployed: number;
    totalDamaged: number;
    totalInRepair: number;
    lowStockCount: number;
    lowStockItems: { id: string; name: string; sku: string; inStockCount: number; minStockThreshold: number }[];
    pendingOrders: number;
    categoryBreakdown: { category: string; count: number; inStock: number }[];
}

// =============================================
// OLT Types
// =============================================

export type OltStatus =
    | "PENDING"
    | "APPROVED"
    | "ACTIVE"
    | "INACTIVE"
    | "MAINTENANCE"
    | "ERROR"
    | "DECOMMISSIONED";
export type PonTechnology =
    | "GPON"
    | "XG_PON"
    | "XGS_PON"
    | "NG_PON2"
    | "EPON"
    | "GEPON";
export type PortType = "PON" | "Ethernet" | "Management" | "Uplink";
export type PortStatus =
    | "ACTIVE"
    | "INACTIVE"
    | "FAULT"
    | "DISABLED"
    | "TESTING";
export type OnuStatus =
    | "ACTIVE"
    | "INACTIVE"
    | "FAULT"
    | "BLOCKED"
    | "PROVISIONING"
    | "UNKNOWN";
export type AlertType =
    | "CPU_HIGH"
    | "MEMORY_HIGH"
    | "TEMPERATURE_HIGH"
    | "POWER_FAILURE"
    | "LINK_DOWN"
    | "SIGNAL_LOW"
    | "DEVICE_OFFLINE"
    | "AUTHENTICATION_FAILURE"
    | "CONFIGURATION_ERROR"
    | "MAINTENANCE_REQUIRED";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "SUPPRESSED";
export type MaintenanceType =
    | "FIRMWARE_UPGRADE"
    | "CONFIGURATION_UPDATE"
    | "HARDWARE_REPLACEMENT"
    | "CLEANING"
    | "INSPECTION"
    | "EMERGENCY";
export type MaintenanceStatus =
    | "SCHEDULED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "POSTPONED";

export interface OLT {
    id: string;
    name: string;
    location: string | null;
    ipAddress: string;
    serialNumber: string | null;
    status: OltStatus;
    oltBrand: {
        id: string;
        name: string;
        displayName: string | null;
    };
    oltVersion: {
        id: string;
        version: string;
        firmware: string | null;
        features: string[] | null;
    };
    ponTechnology: PonTechnology;
    maxCapacity: number;
    currentLoad: number;
    cpuUsage: number;
    ramUsage: number;
    temperature: number | null;
    uptime: number | null;
    lastSyncAt: string | null;
    lastRebootAt: string | null;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    managementInterface: string | null;
    snmpCommunity: string | null;
    sshPort: number;
    maintenanceMode: boolean;
    autoProvisioning: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    _count?: {
        onus: number;
        ports: number;
        oltAlerts: number;
    };
}

export interface OLTBrand {
    id: string;
    name: string;
    displayName: string | null;
    description: string | null;
    supportUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface OLTVersion {
    id: string;
    version: string;
    firmware: string | null;
    releaseDate: string | null;
    features: string[] | null;
    compatibility: string | null;
    oltBrandId: string;
    createdAt: string;
    updatedAt: string;
}

export interface OLTPort {
    id: string;
    portNumber: number;
    portType: PortType;
    status: PortStatus;
    powerLevel: number | null;
    signalStrength: number | null;
    snr: number | null;
    attenuation: number | null;
    rxPower: number | null;
    txPower: number | null;
    dataRateRx: number | null;
    dataRateTx: number | null;
    enabled: boolean;
    vlanId: number | null;
    lastSeen: string | null;
    lastSignalCheck: string | null;
    createdAt: string;
    updatedAt: string;
    onu: ONU | null;
}

export interface ONU {
    id: string;
    serialNumber: string;
    macAddress: string | null;
    oltId: string;
    portId: string | null;
    onuModel: string | null;
    onuBrand: string | null;
    firmwareVersion: string | null;
    hardwareVersion: string | null;
    status: OnuStatus;
    powerLevel: number | null;
    distance: number | null;
    temperature: number | null;
    dataRx: string;
    dataTx: string;
    dataRateRx: number | null;
    dataRateTx: number | null;
    vlanId: number | null;
    speedProfile: string | null;
    qosProfile: string | null;
    autoProvisioned: boolean;
    remoteAccess: boolean;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    installationDate: string | null;
    lastSyncAt: string | null;
    lastSeen: string | null;
    createdAt: string;
    updatedAt: string;
    customer: {
        id: string;
        fullName: string;
        username: string;
    } | null;
    port: OLTPort | null;
}

export interface OLTAlert {
    id: string;
    alertType: AlertType;
    severity: AlertSeverity;
    title: string;
    description: string;
    value: number | null;
    threshold: number | null;
    status: AlertStatus;
    acknowledged: boolean;
    acknowledgedBy: string | null;
    acknowledgedAt: string | null;
    resolvedAt: string | null;
    createdAt: string;
}

export interface MaintenanceSchedule {
    id: string;
    title: string;
    description: string | null;
    scheduledFor: string;
    duration: number;
    type: MaintenanceType;
    status: MaintenanceStatus;
    performedBy: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface OLTDashboardStats {
    onlineUsers: number;
    activeOlts: number;
    approvedOlts: number;
    belowThresholdPower: number;
    wireDown: number;
    weakPower: number;
    systemResources: {
        cpu: { current: number; total: number };
        ram: { current: number; total: number };
        storage: { current: number; total: number };
    };
    totalOlts: number;
    pendingOlts: number;
    totalOnus: number;
}

export interface OLTStats {
    olt: OLT;
    portStats: { status: string; _count: number }[];
    onuStats: { status: string; _count: number }[];
}
