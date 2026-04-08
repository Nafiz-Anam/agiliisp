import { PrismaClient, Role, RouterStatus, ConnectionType, CustomerStatus, InvoiceStatus, PaymentStatus, PaymentMethod, TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log('🌱 Starting ISP demo data seed...');

  // ─── USERS ────────────────────────────────────────────────────────────────
  console.log('👤 Creating users...');
  const pw = async (plain: string) => bcrypt.hash(plain, 10);

  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@agiloisp.com' },
    update: {},
    create: {
      email: 'superadmin@agiloisp.com',
      name: 'Super Admin',
      password: await pw('Super@1234'),
      role: Role.SUPER_ADMIN,
      isEmailVerified: true,
    },
  });

  // Admin (re-use existing or create)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: await pw('Admin@1234'),
      role: Role.ADMIN,
      isEmailVerified: true,
    },
  });

  // Reseller 1
  const resellerUser1 = await prisma.user.upsert({
    where: { email: 'reseller1@agiloisp.com' },
    update: {},
    create: {
      email: 'reseller1@agiloisp.com',
      name: 'NetZone Reseller',
      password: await pw('Reseller@1234'),
      role: Role.RESELLER,
      isEmailVerified: true,
    },
  });

  // Reseller 2
  const resellerUser2 = await prisma.user.upsert({
    where: { email: 'reseller2@agiloisp.com' },
    update: {},
    create: {
      email: 'reseller2@agiloisp.com',
      name: 'FastLink Reseller',
      password: await pw('Reseller@1234'),
      role: Role.RESELLER,
      isEmailVerified: true,
    },
  });

  // Customer users
  const customerUser1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      name: 'John Doe',
      password: await pw('Customer@1234'),
      role: Role.CUSTOMER,
      isEmailVerified: true,
    },
  });

  const customerUser2 = await prisma.user.upsert({
    where: { email: 'sarah.kim@example.com' },
    update: {},
    create: {
      email: 'sarah.kim@example.com',
      name: 'Sarah Kim',
      password: await pw('Customer@1234'),
      role: Role.CUSTOMER,
      isEmailVerified: true,
    },
  });

  const customerUser3 = await prisma.user.upsert({
    where: { email: 'carlos.m@example.com' },
    update: {},
    create: {
      email: 'carlos.m@example.com',
      name: 'Carlos Martinez',
      password: await pw('Customer@1234'),
      role: Role.CUSTOMER,
      isEmailVerified: true,
    },
  });

  console.log('✅ Users created');

  // ─── ROUTERS ──────────────────────────────────────────────────────────────
  console.log('🔌 Creating routers...');

  const router1 = await prisma.router.upsert({
    where: { name: 'Main-Router-HQ' },
    update: {},
    create: {
      name: 'Main-Router-HQ',
      host: '192.168.1.1',
      port: 8728,
      username: 'admin',
      password: 'mikrotik123',
      status: RouterStatus.ONLINE,
      location: 'Head Office - Server Room',
      description: 'Primary MikroTik router for main office area',
      lastConnectedAt: daysAgo(0),
      lastSyncAt: daysAgo(0),
      createdBy: superAdmin.id,
    },
  });

  const router2 = await prisma.router.upsert({
    where: { name: 'Branch-Router-East' },
    update: {},
    create: {
      name: 'Branch-Router-East',
      host: '192.168.2.1',
      port: 8728,
      username: 'admin',
      password: 'mikrotik456',
      status: RouterStatus.ONLINE,
      location: 'East Branch - Cabinet B',
      description: 'MikroTik CCR for east zone coverage',
      lastConnectedAt: daysAgo(1),
      lastSyncAt: daysAgo(1),
      createdBy: superAdmin.id,
    },
  });

  const router3 = await prisma.router.upsert({
    where: { name: 'Tower-Router-North' },
    update: {},
    create: {
      name: 'Tower-Router-North',
      host: '10.0.1.1',
      port: 8728,
      username: 'admin',
      password: 'tower789',
      status: RouterStatus.OFFLINE,
      location: 'North Tower - 5th Floor',
      description: 'Backup tower router — currently offline for maintenance',
      createdBy: superAdmin.id,
    },
  });

  console.log('✅ Routers created');

  // ─── INTERNET PACKAGES ────────────────────────────────────────────────────
  console.log('📦 Creating internet packages...');

  const pkg5mb = await prisma.internetPackage.upsert({
    where: { routerId_name: { routerId: router1.id, name: 'Basic-5Mbps' } },
    update: {},
    create: {
      name: 'Basic-5Mbps',
      routerId: router1.id,
      downloadSpeed: 5120,
      uploadSpeed: 1024,
      price: 15.00,
      costPrice: 8.00,
      description: 'Entry-level home plan – 5 Mbps down / 1 Mbps up',
      isActive: true,
      isPublic: true,
      createdBy: adminUser.id,
    },
  });

  const pkg20mb = await prisma.internetPackage.upsert({
    where: { routerId_name: { routerId: router1.id, name: 'Standard-20Mbps' } },
    update: {},
    create: {
      name: 'Standard-20Mbps',
      routerId: router1.id,
      downloadSpeed: 20480,
      uploadSpeed: 5120,
      price: 35.00,
      costPrice: 18.00,
      description: 'Standard home plan – 20 Mbps down / 5 Mbps up',
      isActive: true,
      isPublic: true,
      createdBy: adminUser.id,
    },
  });

  const pkg50mb = await prisma.internetPackage.upsert({
    where: { routerId_name: { routerId: router1.id, name: 'Pro-50Mbps' } },
    update: {},
    create: {
      name: 'Pro-50Mbps',
      routerId: router1.id,
      downloadSpeed: 51200,
      uploadSpeed: 10240,
      price: 65.00,
      costPrice: 35.00,
      description: 'Pro plan – 50 Mbps down / 10 Mbps up with burst',
      burstDownload: 76800,
      burstUpload: 15360,
      burstTime: 30,
      isActive: true,
      isPublic: true,
      createdBy: adminUser.id,
    },
  });

  const pkg100mb = await prisma.internetPackage.upsert({
    where: { routerId_name: { routerId: router1.id, name: 'Business-100Mbps' } },
    update: {},
    create: {
      name: 'Business-100Mbps',
      routerId: router1.id,
      downloadSpeed: 102400,
      uploadSpeed: 20480,
      price: 120.00,
      costPrice: 70.00,
      description: 'Business plan – 100 Mbps down / 20 Mbps up, static IP',
      burstDownload: 153600,
      burstUpload: 30720,
      burstTime: 60,
      isActive: true,
      isPublic: true,
      createdBy: adminUser.id,
    },
  });

  const pkg10mb_east = await prisma.internetPackage.upsert({
    where: { routerId_name: { routerId: router2.id, name: 'East-10Mbps' } },
    update: {},
    create: {
      name: 'East-10Mbps',
      routerId: router2.id,
      downloadSpeed: 10240,
      uploadSpeed: 2048,
      price: 25.00,
      costPrice: 12.00,
      description: 'East zone residential plan – 10 Mbps',
      isActive: true,
      isPublic: true,
      createdBy: adminUser.id,
    },
  });

  const pkg30mb_east = await prisma.internetPackage.upsert({
    where: { routerId_name: { routerId: router2.id, name: 'East-30Mbps' } },
    update: {},
    create: {
      name: 'East-30Mbps',
      routerId: router2.id,
      downloadSpeed: 30720,
      uploadSpeed: 6144,
      price: 50.00,
      costPrice: 28.00,
      description: 'East zone premium plan – 30 Mbps',
      isActive: true,
      isPublic: true,
      createdBy: adminUser.id,
    },
  });

  console.log('✅ Internet packages created');

  // ─── RESELLERS ────────────────────────────────────────────────────────────
  console.log('🏪 Creating resellers...');

  const reseller1 = await prisma.reseller.upsert({
    where: { userId: resellerUser1.id },
    update: {},
    create: {
      userId: resellerUser1.id,
      businessName: 'NetZone Communications',
      businessRegistration: 'BRN-20231045',
      taxId: 'TAX-NZ-001',
      commissionRate: 15.00,
      creditLimit: 5000.00,
      currentBalance: 1250.00,
      markupPercentage: 10.00,
      canCreatePackages: false,
      canCreateCustomers: true,
      whiteLabelEnabled: false,
      supportPhone: '+1-555-0101',
      supportEmail: 'support@netzone.local',
      notes: 'Covers north and west residential zones. Preferred reseller.',
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  const reseller2 = await prisma.reseller.upsert({
    where: { userId: resellerUser2.id },
    update: {},
    create: {
      userId: resellerUser2.id,
      businessName: 'FastLink Solutions',
      businessRegistration: 'BRN-20240078',
      taxId: 'TAX-FL-002',
      commissionRate: 12.00,
      creditLimit: 3000.00,
      currentBalance: 420.00,
      markupPercentage: 8.00,
      canCreatePackages: false,
      canCreateCustomers: true,
      whiteLabelEnabled: true,
      companyLogo: null,
      primaryColor: '#2563EB',
      supportPhone: '+1-555-0202',
      supportEmail: 'support@fastlink.local',
      notes: 'Covers east zone. White-label enabled.',
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  console.log('✅ Resellers created');

  // ─── ISP CUSTOMERS ────────────────────────────────────────────────────────
  console.log('👥 Creating ISP customers...');

  const ispCustomer1 = await prisma.ispCustomer.upsert({
    where: { username: 'john.doe' },
    update: {},
    create: {
      userId: customerUser1.id,
      resellerId: reseller1.id,
      routerId: router1.id,
      packageId: pkg50mb.id,
      username: 'john.doe',
      password: 'pppoe_pass_001',
      connectionType: ConnectionType.PPPOE,
      ipAddress: '10.10.1.101',
      macAddress: 'AA:BB:CC:11:22:33',
      serviceName: 'pppoe-john',
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-1001',
      address: '123 Maple Street',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'US',
      billingCycle: 1,
      nextBillingDate: daysFromNow(15),
      gracePeriod: 3,
      autoSuspend: true,
      autoSuspendDays: 7,
      status: CustomerStatus.ACTIVE,
      isOnline: true,
      lastOnlineAt: new Date(),
      installationDate: daysAgo(90),
      dataUsed: BigInt(32212254720), // ~30 GB
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  const ispCustomer2 = await prisma.ispCustomer.upsert({
    where: { username: 'sarah.kim' },
    update: {},
    create: {
      userId: customerUser2.id,
      resellerId: reseller1.id,
      routerId: router1.id,
      packageId: pkg20mb.id,
      username: 'sarah.kim',
      password: 'pppoe_pass_002',
      connectionType: ConnectionType.PPPOE,
      ipAddress: '10.10.1.102',
      macAddress: 'AA:BB:CC:44:55:66',
      serviceName: 'pppoe-sarah',
      fullName: 'Sarah Kim',
      email: 'sarah.kim@example.com',
      phone: '+1-555-1002',
      address: '456 Oak Avenue',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62702',
      country: 'US',
      billingCycle: 1,
      nextBillingDate: daysFromNow(8),
      gracePeriod: 3,
      autoSuspend: true,
      status: CustomerStatus.ACTIVE,
      isOnline: false,
      lastOnlineAt: daysAgo(1),
      installationDate: daysAgo(60),
      dataUsed: BigInt(15032385536), // ~14 GB
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  const ispCustomer3 = await prisma.ispCustomer.upsert({
    where: { username: 'carlos.m' },
    update: {},
    create: {
      userId: customerUser3.id,
      resellerId: reseller2.id,
      routerId: router2.id,
      packageId: pkg30mb_east.id,
      username: 'carlos.m',
      password: 'pppoe_pass_003',
      connectionType: ConnectionType.PPPOE,
      ipAddress: '10.10.2.101',
      macAddress: 'DD:EE:FF:11:22:33',
      serviceName: 'pppoe-carlos',
      fullName: 'Carlos Martinez',
      email: 'carlos.m@example.com',
      phone: '+1-555-2001',
      address: '789 Pine Road',
      city: 'Eastville',
      state: 'IL',
      zipCode: '62801',
      country: 'US',
      billingCycle: 1,
      nextBillingDate: daysFromNow(22),
      gracePeriod: 5,
      autoSuspend: true,
      status: CustomerStatus.ACTIVE,
      isOnline: true,
      lastOnlineAt: new Date(),
      installationDate: daysAgo(45),
      dataUsed: BigInt(21474836480), // ~20 GB
      isActive: true,
      createdBy: resellerUser2.id,
    },
  });

  const ispCustomer4 = await prisma.ispCustomer.upsert({
    where: { username: 'emily.w' },
    update: {},
    create: {
      resellerId: reseller2.id,
      routerId: router2.id,
      packageId: pkg10mb_east.id,
      username: 'emily.w',
      password: 'pppoe_pass_004',
      connectionType: ConnectionType.PPPOE,
      ipAddress: '10.10.2.102',
      fullName: 'Emily Watson',
      email: 'emily.w@email.com',
      phone: '+1-555-2002',
      address: '22 Birch Lane',
      city: 'Eastville',
      state: 'IL',
      zipCode: '62801',
      country: 'US',
      billingCycle: 1,
      nextBillingDate: daysFromNow(3),
      gracePeriod: 3,
      autoSuspend: true,
      status: CustomerStatus.SUSPENDED,
      isOnline: false,
      installationDate: daysAgo(120),
      dataUsed: BigInt(5368709120), // ~5 GB
      isActive: true,
      createdBy: resellerUser2.id,
    },
  });

  const ispCustomer5 = await prisma.ispCustomer.upsert({
    where: { username: 'mike.t' },
    update: {},
    create: {
      routerId: router1.id,
      packageId: pkg100mb.id,
      username: 'mike.t',
      password: 'pppoe_pass_005',
      connectionType: ConnectionType.PPPOE,
      ipAddress: '10.10.1.200',
      macAddress: 'BB:CC:DD:AA:11:22',
      serviceName: 'pppoe-mike-biz',
      fullName: 'Mike Thompson',
      email: 'mike.t@thompsonbiz.com',
      phone: '+1-555-3001',
      address: '1 Business Park Blvd',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62703',
      country: 'US',
      billingCycle: 1,
      nextBillingDate: daysFromNow(20),
      gracePeriod: 7,
      autoSuspend: false,
      status: CustomerStatus.ACTIVE,
      isOnline: true,
      lastOnlineAt: new Date(),
      installationDate: daysAgo(200),
      dataUsed: BigInt(107374182400), // ~100 GB
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  const ispCustomer6 = await prisma.ispCustomer.upsert({
    where: { username: 'pending.user' },
    update: {},
    create: {
      routerId: router1.id,
      packageId: pkg5mb.id,
      username: 'pending.user',
      password: 'pppoe_pass_006',
      connectionType: ConnectionType.PPPOE,
      fullName: 'New Pending Customer',
      email: 'pending@example.com',
      phone: '+1-555-9999',
      address: '999 Pending Street',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62705',
      country: 'US',
      billingCycle: 1,
      nextBillingDate: daysFromNow(30),
      gracePeriod: 3,
      autoSuspend: true,
      status: CustomerStatus.PENDING_ACTIVATION,
      isOnline: false,
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  console.log('✅ ISP customers created');

  // ─── INVOICES ─────────────────────────────────────────────────────────────
  console.log('🧾 Creating invoices...');

  // Helper to create invoice
  const makeInvoice = async (
    num: string,
    customer: typeof ispCustomer1,
    pkg: typeof pkg50mb,
    resellerId: string | null,
    status: InvoiceStatus,
    daysAgoN: number,
    paidAmount: number = 0
  ) => {
    const price = Number(pkg.price);
    const tax = +(price * 0.05).toFixed(2);
    const total = +(price + tax).toFixed(2);
    const balance = +(total - paidAmount).toFixed(2);
    const invoiceDate = daysAgo(daysAgoN);
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 15);

    return prisma.invoice.upsert({
      where: { invoiceNumber: num },
      update: {},
      create: {
        invoiceNumber: num,
        customerId: customer.id,
        resellerId: resellerId ?? undefined,
        subtotal: price,
        taxAmount: tax,
        discountAmount: 0,
        totalAmount: total,
        paidAmount,
        balanceDue: balance,
        invoiceDate,
        dueDate,
        paidDate: paidAmount >= total ? invoiceDate : undefined,
        sentDate: status !== InvoiceStatus.DRAFT ? invoiceDate : undefined,
        status,
        isRecurring: true,
        recurringPeriod: 'monthly',
        notes: 'Monthly internet service fee',
        items: {
          create: [{
            description: `${pkg.name} — Monthly Internet Service`,
            packageId: pkg.id,
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
            periodStart: invoiceDate,
            periodEnd: dueDate,
          }],
        },
      },
    });
  };

  // John Doe invoices (3 months)
  const inv1 = await makeInvoice('INV-2026-0001', ispCustomer1, pkg50mb, reseller1.id, InvoiceStatus.PAID, 60, 68.25);
  const inv2 = await makeInvoice('INV-2026-0002', ispCustomer1, pkg50mb, reseller1.id, InvoiceStatus.PAID, 30, 68.25);
  const inv3 = await makeInvoice('INV-2026-0003', ispCustomer1, pkg50mb, reseller1.id, InvoiceStatus.SENT, 5);

  // Sarah Kim invoices
  const inv4 = await makeInvoice('INV-2026-0004', ispCustomer2, pkg20mb, reseller1.id, InvoiceStatus.PAID, 45, 36.75);
  const inv5 = await makeInvoice('INV-2026-0005', ispCustomer2, pkg20mb, reseller1.id, InvoiceStatus.OVERDUE, 20);

  // Carlos invoices
  const inv6 = await makeInvoice('INV-2026-0006', ispCustomer3, pkg30mb_east, reseller2.id, InvoiceStatus.PAID, 35, 52.50);
  const inv7 = await makeInvoice('INV-2026-0007', ispCustomer3, pkg30mb_east, reseller2.id, InvoiceStatus.SENT, 3);

  // Mike Thompson (business) invoices
  const inv8 = await makeInvoice('INV-2026-0008', ispCustomer5, pkg100mb, null, InvoiceStatus.PAID, 50, 126.00);
  const inv9 = await makeInvoice('INV-2026-0009', ispCustomer5, pkg100mb, null, InvoiceStatus.PAID, 20, 126.00);
  const inv10 = await makeInvoice('INV-2026-0010', ispCustomer5, pkg100mb, null, InvoiceStatus.SENT, 2);

  // Emily Watson (suspended, overdue)
  const inv11 = await makeInvoice('INV-2026-0011', ispCustomer4, pkg10mb_east, reseller2.id, InvoiceStatus.OVERDUE, 40);

  console.log('✅ Invoices created');

  // ─── PAYMENTS ─────────────────────────────────────────────────────────────
  console.log('💳 Creating payments...');

  const makePayment = async (
    invoice: typeof inv1,
    customer: typeof ispCustomer1,
    resellerId: string | null,
    amount: number,
    method: PaymentMethod,
    daysAgoN: number,
    ref: string
  ) => prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      customerId: customer.id,
      resellerId: resellerId ?? undefined,
      amount,
      paymentMethod: method,
      paymentDate: daysAgo(daysAgoN),
      status: PaymentStatus.COMPLETED,
      referenceNumber: ref,
      verifiedBy: adminUser.id,
      verifiedAt: daysAgo(daysAgoN),
      createdBy: adminUser.id,
    },
  });

  await makePayment(inv1, ispCustomer1, reseller1.id, 68.25, PaymentMethod.BANK_TRANSFER, 58, 'TXN-BT-001');
  await makePayment(inv2, ispCustomer1, reseller1.id, 68.25, PaymentMethod.BANK_TRANSFER, 28, 'TXN-BT-002');
  await makePayment(inv4, ispCustomer2, reseller1.id, 36.75, PaymentMethod.CASH, 43, 'TXN-CASH-001');
  await makePayment(inv6, ispCustomer3, reseller2.id, 52.50, PaymentMethod.MOBILE_MONEY, 33, 'TXN-MM-001');
  await makePayment(inv8, ispCustomer5, null, 126.00, PaymentMethod.BANK_TRANSFER, 48, 'TXN-BT-003');
  await makePayment(inv9, ispCustomer5, null, 126.00, PaymentMethod.BANK_TRANSFER, 18, 'TXN-BT-004');

  console.log('✅ Payments created');

  // ─── SUPPORT TICKETS ──────────────────────────────────────────────────────
  console.log('🎫 Creating support tickets...');

  await prisma.supportTicket.upsert({
    where: { ticketNumber: 'TKT-2026-0001' },
    update: {},
    create: {
      ticketNumber: 'TKT-2026-0001',
      customerId: ispCustomer1.id,
      subject: 'Slow internet speed during peak hours',
      description: 'My connection drops to below 10 Mbps every evening between 7-10 PM. I am on the 50 Mbps plan. Please investigate.',
      category: 'Technical',
      priority: TicketPriority.HIGH,
      status: TicketStatus.IN_PROGRESS,
      assignedTo: adminUser.id,
      openedAt: daysAgo(5),
    },
  });

  await prisma.supportTicket.upsert({
    where: { ticketNumber: 'TKT-2026-0002' },
    update: {},
    create: {
      ticketNumber: 'TKT-2026-0002',
      customerId: ispCustomer2.id,
      subject: 'Cannot connect after router reboot',
      description: 'My router was rebooted last night during a power outage and now I cannot get an IP address. The PPPoE session keeps failing.',
      category: 'Technical',
      priority: TicketPriority.CRITICAL,
      status: TicketStatus.OPEN,
      openedAt: daysAgo(1),
    },
  });

  await prisma.supportTicket.upsert({
    where: { ticketNumber: 'TKT-2026-0003' },
    update: {},
    create: {
      ticketNumber: 'TKT-2026-0003',
      customerId: ispCustomer4.id,
      subject: 'Account suspended — payment was made',
      description: 'My account was suspended but I already paid via mobile money 3 days ago. Reference: TXN-MM-EMILY-001. Please reactivate.',
      category: 'Billing',
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      openedAt: daysAgo(2),
    },
  });

  await prisma.supportTicket.upsert({
    where: { ticketNumber: 'TKT-2026-0004' },
    update: {},
    create: {
      ticketNumber: 'TKT-2026-0004',
      customerId: ispCustomer5.id,
      subject: 'Request to upgrade to dedicated line',
      description: 'We would like to upgrade our business connection to a dedicated 200 Mbps symmetric line. Please advise on pricing and timeline.',
      category: 'Sales',
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      openedAt: daysAgo(3),
    },
  });

  await prisma.supportTicket.upsert({
    where: { ticketNumber: 'TKT-2026-0005' },
    update: {},
    create: {
      ticketNumber: 'TKT-2026-0005',
      customerId: ispCustomer3.id,
      subject: 'DNS issues — some websites not loading',
      description: 'Several websites like github.com and npmjs.com are not resolving. Other sites work fine. Started 2 days ago.',
      category: 'Technical',
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.RESOLVED,
      assignedTo: adminUser.id,
      openedAt: daysAgo(7),
      resolvedAt: daysAgo(6),
    },
  });

  await prisma.supportTicket.upsert({
    where: { ticketNumber: 'TKT-2026-0006' },
    update: {},
    create: {
      ticketNumber: 'TKT-2026-0006',
      customerId: ispCustomer1.id,
      subject: 'Request invoice copy for tax records',
      description: 'Please send me copies of all invoices from January to March 2026 for my tax filing.',
      category: 'Billing',
      priority: TicketPriority.LOW,
      status: TicketStatus.CLOSED,
      assignedTo: adminUser.id,
      openedAt: daysAgo(14),
      resolvedAt: daysAgo(13),
      closedAt: daysAgo(12),
    },
  });

  console.log('✅ Support tickets created');

  console.log('\n🎉 ISP demo seed complete!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  LOGIN CREDENTIALS');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SUPER ADMIN');
  console.log('    Email:    superadmin@agiloisp.com');
  console.log('    Password: Super@1234');
  console.log('');
  console.log('  ADMIN');
  console.log('    Email:    admin@example.com');
  console.log('    Password: Admin@1234');
  console.log('');
  console.log('  RESELLER 1 — NetZone Communications');
  console.log('    Email:    reseller1@agiloisp.com');
  console.log('    Password: Reseller@1234');
  console.log('');
  console.log('  RESELLER 2 — FastLink Solutions');
  console.log('    Email:    reseller2@agiloisp.com');
  console.log('    Password: Reseller@1234');
  console.log('');
  console.log('  CUSTOMER — John Doe (Active, 50Mbps)');
  console.log('    Email:    john.doe@example.com');
  console.log('    Password: Customer@1234');
  console.log('');
  console.log('  CUSTOMER — Sarah Kim (Active, 20Mbps)');
  console.log('    Email:    sarah.kim@example.com');
  console.log('    Password: Customer@1234');
  console.log('');
  console.log('  CUSTOMER — Carlos Martinez (Active, 30Mbps)');
  console.log('    Email:    carlos.m@example.com');
  console.log('    Password: Customer@1234');
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch((e) => { console.error('ISP seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
