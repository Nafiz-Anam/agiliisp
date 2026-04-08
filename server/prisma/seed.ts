import { PrismaClient } from '@prisma/client';
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
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  console.log('Empty database detected. Seeding...');

  // ═══════════════════════════════════════════
  // 1. USERS
  // ═══════════════════════════════════════════
  console.log('Seeding users...');
  const hashedAdmin = await bcrypt.hash('Admin@1234', 10);
  const hashedSuper = await bcrypt.hash('SuperAdmin@1234', 10);
  const hashedReseller = await bcrypt.hash('Reseller@1234', 10);
  const hashedCustomer = await bcrypt.hash('Customer@1234', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedAdmin,
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@agiloisp.com',
      name: 'Super Admin',
      password: hashedSuper,
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
    },
  });

  const resellerUser1 = await prisma.user.create({
    data: {
      email: 'reseller1@agiloisp.com',
      name: 'NetConnect Solutions',
      password: hashedReseller,
      role: 'RESELLER',
      isEmailVerified: true,
    },
  });

  const resellerUser2 = await prisma.user.create({
    data: {
      email: 'reseller2@agiloisp.com',
      name: 'FastLink Networks',
      password: hashedReseller,
      role: 'RESELLER',
      isEmailVerified: true,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: 'john.doe@example.com',
      name: 'John Doe',
      password: hashedCustomer,
      role: 'CUSTOMER',
      isEmailVerified: true,
    },
  });

  // ═══════════════════════════════════════════
  // 2. ROUTERS (MikroTik)
  // ═══════════════════════════════════════════
  console.log('Seeding routers...');
  const router1 = await prisma.router.create({
    data: {
      name: 'MK-Main-Gateway',
      host: '192.168.88.1',
      port: 8728,
      username: 'admin',
      password: 'encrypted_pass_1',
      status: 'ONLINE',
      lastConnectedAt: new Date(),
      lastSyncAt: daysAgo(0),
      syncEnabled: true,
      location: 'Main Office - Server Room A',
      description: 'Primary MikroTik CCR1036 gateway router',
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  const router2 = await prisma.router.create({
    data: {
      name: 'MK-Branch-North',
      host: '192.168.89.1',
      port: 8728,
      username: 'admin',
      password: 'encrypted_pass_2',
      status: 'ONLINE',
      lastConnectedAt: new Date(),
      lastSyncAt: daysAgo(1),
      syncEnabled: true,
      location: 'North Branch Office',
      description: 'MikroTik RB4011 branch router',
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  const router3 = await prisma.router.create({
    data: {
      name: 'MK-Branch-South',
      host: '192.168.90.1',
      port: 8728,
      username: 'admin',
      password: 'encrypted_pass_3',
      status: 'OFFLINE',
      lastConnectedAt: daysAgo(2),
      lastSyncAt: daysAgo(3),
      syncEnabled: true,
      location: 'South Branch Office',
      description: 'MikroTik hEX S branch router',
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  await prisma.router.create({
    data: {
      name: 'MK-Warehouse',
      host: '192.168.91.1',
      port: 8728,
      username: 'admin',
      password: 'encrypted_pass_4',
      status: 'MAINTENANCE',
      lastConnectedAt: daysAgo(5),
      syncEnabled: false,
      location: 'Warehouse B',
      description: 'MikroTik RB750Gr3 - under maintenance',
      isActive: false,
      createdBy: adminUser.id,
    },
  });

  // ═══════════════════════════════════════════
  // 3. INTERNET PACKAGES
  // ═══════════════════════════════════════════
  console.log('Seeding packages...');
  const pkg1 = await prisma.internetPackage.create({
    data: {
      name: 'Basic Home 10M',
      routerId: router1.id,
      downloadSpeed: 10,
      uploadSpeed: 5,
      dataLimit: 100,
      priority: 8,
      price: 15.0,
      costPrice: 5.0,
      description: 'Basic home internet - 10Mbps down / 5Mbps up, 100GB cap',
      isActive: true,
      isPublic: true,
      createdBy: adminUser.id,
    },
  });

  const pkg2 = await prisma.internetPackage.create({
    data: {
      name: 'Standard Home 25M',
      routerId: router1.id,
      downloadSpeed: 25,
      uploadSpeed: 10,
      dataLimit: 300,
      burstDownload: 30,
      burstUpload: 12,
      priority: 6,
      price: 29.99,
      costPrice: 10.0,
      description: 'Standard home internet - 25Mbps down / 10Mbps up, 300GB cap',
      isActive: true,
      isPublic: true,
      createdBy: adminUser.id,
    },
  });

  const pkg3 = await prisma.internetPackage.create({
    data: {
      name: 'Premium Home 50M',
      routerId: router1.id,
      downloadSpeed: 50,
      uploadSpeed: 25,
      burstDownload: 60,
      burstUpload: 30,
      priority: 4,
      price: 49.99,
      costPrice: 18.0,
      description: 'Premium unlimited home internet - 50Mbps down / 25Mbps up',
      isActive: true,
      isPublic: true,
      createdBy: adminUser.id,
    },
  });

  const pkg4 = await prisma.internetPackage.create({
    data: {
      name: 'Business 100M',
      routerId: router1.id,
      downloadSpeed: 100,
      uploadSpeed: 50,
      burstDownload: 120,
      burstUpload: 60,
      priority: 2,
      price: 99.99,
      costPrice: 35.0,
      description: 'Business unlimited - 100Mbps symmetric, SLA guaranteed',
      isActive: true,
      isPublic: true,
      createdBy: adminUser.id,
    },
  });

  const pkg5 = await prisma.internetPackage.create({
    data: {
      name: 'Enterprise 200M',
      routerId: router2.id,
      downloadSpeed: 200,
      uploadSpeed: 100,
      priority: 1,
      price: 199.99,
      costPrice: 70.0,
      description: 'Enterprise grade - dedicated bandwidth, 24/7 support',
      isActive: true,
      isPublic: false,
      createdBy: adminUser.id,
    },
  });

  const pkg6 = await prisma.internetPackage.create({
    data: {
      name: 'Student 5M',
      routerId: router2.id,
      downloadSpeed: 5,
      uploadSpeed: 2,
      dataLimit: 50,
      priority: 8,
      price: 9.99,
      costPrice: 3.0,
      description: 'Affordable student package - 5Mbps, 50GB cap',
      isActive: true,
      isPublic: true,
      createdBy: adminUser.id,
    },
  });

  // ═══════════════════════════════════════════
  // 4. RESELLERS
  // ═══════════════════════════════════════════
  console.log('Seeding resellers...');
  const reseller1 = await prisma.reseller.create({
    data: {
      userId: resellerUser1.id,
      businessName: 'NetConnect Solutions',
      businessRegistration: 'NC-2024-001',
      taxId: 'TAX-NC-001',
      commissionRate: 15.0,
      creditLimit: 5000.0,
      currentBalance: 1250.0,
      markupPercentage: 10.0,
      canCreatePackages: false,
      canCreateCustomers: true,
      supportPhone: '+1-555-0101',
      supportEmail: 'support@netconnect.com',
      notes: 'Top performing reseller in the north region',
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  const reseller2 = await prisma.reseller.create({
    data: {
      userId: resellerUser2.id,
      businessName: 'FastLink Networks',
      businessRegistration: 'FL-2024-002',
      taxId: 'TAX-FL-002',
      commissionRate: 12.0,
      creditLimit: 3000.0,
      currentBalance: 800.0,
      markupPercentage: 8.0,
      canCreatePackages: false,
      canCreateCustomers: true,
      supportPhone: '+1-555-0202',
      supportEmail: 'support@fastlink.net',
      notes: 'Expanding into south region',
      isActive: true,
      createdBy: adminUser.id,
    },
  });

  // ═══════════════════════════════════════════
  // 5. ISP CUSTOMERS
  // ═══════════════════════════════════════════
  console.log('Seeding customers...');
  const customersData = [
    { username: 'john.doe', fullName: 'John Doe', email: 'john.doe@example.com', phone: '+1-555-1001', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.1.10', macAddress: 'AA:BB:CC:DD:EE:01', isOnline: true, routerId: router1.id, packageId: pkg3.id, resellerId: null as string | null, userId: customerUser.id, city: 'New York', address: '123 Elm St, Apt 4B' },
    { username: 'jane.smith', fullName: 'Jane Smith', email: 'jane.smith@example.com', phone: '+1-555-1002', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.1.11', macAddress: 'AA:BB:CC:DD:EE:02', isOnline: true, routerId: router1.id, packageId: pkg2.id, resellerId: reseller1.id, userId: null as string | null, city: 'Brooklyn', address: '456 Oak Ave' },
    { username: 'bob.wilson', fullName: 'Bob Wilson', email: 'bob.wilson@example.com', phone: '+1-555-1003', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.1.12', macAddress: 'AA:BB:CC:DD:EE:03', isOnline: false, routerId: router1.id, packageId: pkg4.id, resellerId: null as string | null, userId: null as string | null, city: 'Manhattan', address: '789 Pine Rd' },
    { username: 'alice.brown', fullName: 'Alice Brown', email: 'alice.brown@example.com', phone: '+1-555-1004', connectionType: 'STATIC_IP' as const, status: 'ACTIVE' as const, ipAddress: '10.10.2.20', macAddress: 'AA:BB:CC:DD:EE:04', isOnline: true, routerId: router2.id, packageId: pkg5.id, resellerId: null as string | null, userId: null as string | null, city: 'Queens', address: '321 Birch Ln' },
    { username: 'charlie.davis', fullName: 'Charlie Davis', email: 'charlie.d@example.com', phone: '+1-555-1005', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.1.13', macAddress: 'AA:BB:CC:DD:EE:05', isOnline: true, routerId: router1.id, packageId: pkg1.id, resellerId: reseller1.id, userId: null as string | null, city: 'Bronx', address: '654 Cedar St' },
    { username: 'diana.evans', fullName: 'Diana Evans', email: 'diana.e@example.com', phone: '+1-555-1006', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.1.14', macAddress: 'AA:BB:CC:DD:EE:06', isOnline: false, routerId: router1.id, packageId: pkg2.id, resellerId: reseller2.id, userId: null as string | null, city: 'Staten Island', address: '987 Maple Dr' },
    { username: 'edward.garcia', fullName: 'Edward Garcia', email: 'edward.g@example.com', phone: '+1-555-1007', connectionType: 'DHCP' as const, status: 'SUSPENDED' as const, ipAddress: '10.10.1.15', macAddress: 'AA:BB:CC:DD:EE:07', isOnline: false, routerId: router1.id, packageId: pkg1.id, resellerId: null as string | null, userId: null as string | null, city: 'Hoboken', address: '111 Willow Way' },
    { username: 'fiona.harris', fullName: 'Fiona Harris', email: 'fiona.h@example.com', phone: '+1-555-1008', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.2.21', macAddress: 'AA:BB:CC:DD:EE:08', isOnline: true, routerId: router2.id, packageId: pkg3.id, resellerId: reseller1.id, userId: null as string | null, city: 'Jersey City', address: '222 Spruce Ave' },
    { username: 'george.miller', fullName: 'George Miller', email: 'george.m@example.com', phone: '+1-555-1009', connectionType: 'PPPOE' as const, status: 'PENDING_ACTIVATION' as const, ipAddress: null, macAddress: null, isOnline: false, routerId: router2.id, packageId: pkg6.id, resellerId: null as string | null, userId: null as string | null, city: 'Newark', address: '333 Ash Blvd' },
    { username: 'hannah.jackson', fullName: 'Hannah Jackson', email: 'hannah.j@example.com', phone: '+1-555-1010', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.1.16', macAddress: 'AA:BB:CC:DD:EE:10', isOnline: true, routerId: router1.id, packageId: pkg2.id, resellerId: null as string | null, userId: null as string | null, city: 'New York', address: '444 Poplar St' },
    { username: 'ivan.kim', fullName: 'Ivan Kim', email: 'ivan.k@example.com', phone: '+1-555-1011', connectionType: 'HOTSPOT' as const, status: 'ACTIVE' as const, ipAddress: '10.10.1.17', macAddress: 'AA:BB:CC:DD:EE:11', isOnline: true, routerId: router1.id, packageId: pkg1.id, resellerId: reseller2.id, userId: null as string | null, city: 'Brooklyn', address: '555 Walnut Ct' },
    { username: 'julia.lee', fullName: 'Julia Lee', email: 'julia.l@example.com', phone: '+1-555-1012', connectionType: 'PPPOE' as const, status: 'TERMINATED' as const, ipAddress: null, macAddress: 'AA:BB:CC:DD:EE:12', isOnline: false, routerId: router1.id, packageId: pkg1.id, resellerId: null as string | null, userId: null as string | null, city: 'Manhattan', address: '666 Chestnut Ave' },
    { username: 'kevin.moore', fullName: 'Kevin Moore', email: 'kevin.m@example.com', phone: '+1-555-1013', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.2.22', macAddress: 'AA:BB:CC:DD:EE:13', isOnline: false, routerId: router2.id, packageId: pkg4.id, resellerId: reseller1.id, userId: null as string | null, city: 'Queens', address: '777 Redwood Pl' },
    { username: 'laura.nelson', fullName: 'Laura Nelson', email: 'laura.n@example.com', phone: '+1-555-1014', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.1.18', macAddress: 'AA:BB:CC:DD:EE:14', isOnline: true, routerId: router1.id, packageId: pkg3.id, resellerId: null as string | null, userId: null as string | null, city: 'Bronx', address: '888 Sequoia Dr' },
    { username: 'mike.ortiz', fullName: 'Mike Ortiz', email: 'mike.o@example.com', phone: '+1-555-1015', connectionType: 'STATIC_IP' as const, status: 'ACTIVE' as const, ipAddress: '10.10.2.23', macAddress: 'AA:BB:CC:DD:EE:15', isOnline: true, routerId: router2.id, packageId: pkg5.id, resellerId: null as string | null, userId: null as string | null, city: 'Manhattan', address: '999 Cypress Ln' },
    { username: 'nancy.perez', fullName: 'Nancy Perez', email: 'nancy.p@example.com', phone: '+1-555-1016', connectionType: 'PPPOE' as const, status: 'SUSPENDED' as const, ipAddress: '10.10.1.19', macAddress: 'AA:BB:CC:DD:EE:16', isOnline: false, routerId: router1.id, packageId: pkg2.id, resellerId: reseller2.id, userId: null as string | null, city: 'Staten Island', address: '101 Magnolia Rd' },
    { username: 'oscar.quinn', fullName: 'Oscar Quinn', email: 'oscar.q@example.com', phone: '+1-555-1017', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.1.20', macAddress: 'AA:BB:CC:DD:EE:17', isOnline: true, routerId: router1.id, packageId: pkg3.id, resellerId: null as string | null, userId: null as string | null, city: 'New York', address: '202 Dogwood St' },
    { username: 'paula.reed', fullName: 'Paula Reed', email: 'paula.r@example.com', phone: '+1-555-1018', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.2.24', macAddress: 'AA:BB:CC:DD:EE:18', isOnline: false, routerId: router2.id, packageId: pkg6.id, resellerId: reseller1.id, userId: null as string | null, city: 'Jersey City', address: '303 Hazel Ave' },
    { username: 'robert.scott', fullName: 'Robert Scott', email: 'robert.s@example.com', phone: '+1-555-1019', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.1.21', macAddress: 'AA:BB:CC:DD:EE:19', isOnline: true, routerId: router1.id, packageId: pkg4.id, resellerId: null as string | null, userId: null as string | null, city: 'Brooklyn', address: '404 Juniper Ct' },
    { username: 'sarah.thomas', fullName: 'Sarah Thomas', email: 'sarah.t@example.com', phone: '+1-555-1020', connectionType: 'PPPOE' as const, status: 'ACTIVE' as const, ipAddress: '10.10.1.22', macAddress: 'AA:BB:CC:DD:EE:20', isOnline: true, routerId: router1.id, packageId: pkg2.id, resellerId: null as string | null, userId: null as string | null, city: 'Queens', address: '505 Hickory Blvd' },
  ];

  const customers: any[] = [];
  for (const c of customersData) {
    const customer = await prisma.ispCustomer.create({
      data: {
        username: c.username,
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        connectionType: c.connectionType,
        status: c.status,
        ipAddress: c.ipAddress,
        macAddress: c.macAddress,
        isOnline: c.isOnline,
        routerId: c.routerId,
        packageId: c.packageId,
        resellerId: c.resellerId,
        userId: c.userId,
        city: c.city,
        address: c.address,
        billingCycle: 1,
        nextBillingDate: daysFromNow(Math.floor(Math.random() * 28) + 1),
        installationDate: daysAgo(Math.floor(Math.random() * 180) + 30),
        lastOnlineAt: c.isOnline ? new Date() : daysAgo(Math.floor(Math.random() * 5)),
        dataUsed: BigInt(Math.floor(Math.random() * 50000000000)),
        createdBy: adminUser.id,
      },
    });
    customers.push(customer);
  }

  // ═══════════════════════════════════════════
  // 6. INVOICES & PAYMENTS
  // ═══════════════════════════════════════════
  console.log('Seeding invoices and payments...');
  const activeCustomers = customers.filter((c: any) => c.status === 'ACTIVE' || c.status === 'SUSPENDED');
  const allPackages = [pkg1, pkg2, pkg3, pkg4, pkg5, pkg6];
  let invoiceCounter = 1;

  for (const customer of activeCustomers) {
    const custData = customersData.find(cd => cd.username === customer.username)!;
    const pkg = allPackages.find(p => p.id === custData.packageId)!;

    // Create 3 months of invoices per customer
    for (let month = 2; month >= 0; month--) {
      const invoiceDate = daysAgo(month * 30 + 5);
      const dueDate = daysAgo(month * 30 - 10);
      const price = Number(pkg.price);
      const num = String(invoiceCounter++).padStart(5, '0');

      let status: 'PAID' | 'SENT' | 'OVERDUE' | 'DRAFT' | 'PARTIALLY_PAID';
      let paidAmount = 0;
      if (month === 2) { status = 'PAID'; paidAmount = price; }
      else if (month === 1) {
        if (customer.status === 'SUSPENDED') { status = 'OVERDUE'; paidAmount = 0; }
        else { status = 'PAID'; paidAmount = price; }
      } else {
        if (customer.status === 'SUSPENDED') { status = 'OVERDUE'; paidAmount = 0; }
        else {
          const r = Math.random();
          if (r < 0.4) { status = 'PAID'; paidAmount = price; }
          else if (r < 0.7) { status = 'SENT'; paidAmount = 0; }
          else if (r < 0.85) { status = 'PARTIALLY_PAID'; paidAmount = Math.round(price * 0.5 * 100) / 100; }
          else { status = 'DRAFT'; paidAmount = 0; }
        }
      }

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-2026-${num}`,
          customerId: customer.id,
          resellerId: custData.resellerId,
          subtotal: price,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: price,
          paidAmount,
          balanceDue: price - paidAmount,
          invoiceDate,
          dueDate,
          paidDate: status === 'PAID' ? daysAgo(month * 30) : null,
          status,
          isRecurring: true,
          recurringPeriod: 'monthly',
          notes: `Monthly internet service - ${pkg.name}`,
          createdBy: adminUser.id,
        },
      });

      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          description: `${pkg.name} - Monthly Subscription`,
          packageId: pkg.id,
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          periodStart: invoiceDate,
          periodEnd: daysAgo((month - 1) * 30 + 5),
        },
      });

      // Create payment for paid invoices
      if (paidAmount > 0) {
        const methods = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CREDIT_CARD', 'ONLINE_PAYMENT'] as const;
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            customerId: customer.id,
            resellerId: custData.resellerId,
            amount: paidAmount,
            paymentMethod: methods[Math.floor(Math.random() * methods.length)],
            paymentDate: status === 'PAID' ? daysAgo(month * 30) : daysAgo(month * 30 - 3),
            status: 'COMPLETED',
            referenceNumber: `PAY-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
            createdBy: adminUser.id,
          },
        });
      }
    }
  }

  // ═══════════════════════════════════════════
  // 7. SUPPORT TICKETS
  // ═══════════════════════════════════════════
  console.log('Seeding support tickets...');
  const ticketData = [
    { customerIdx: 0, subject: 'Internet speed is slow', description: 'My download speed has dropped significantly since yesterday. Expected 50Mbps but getting only 10Mbps.', category: 'Technical', priority: 'HIGH' as const, status: 'OPEN' as const },
    { customerIdx: 1, subject: 'Cannot connect to WiFi', description: 'After power outage, my router is not broadcasting WiFi signal. All lights are normal.', category: 'Technical', priority: 'MEDIUM' as const, status: 'IN_PROGRESS' as const },
    { customerIdx: 2, subject: 'Billing discrepancy', description: 'I was charged twice for the month of March. Please refund the extra payment.', category: 'Billing', priority: 'MEDIUM' as const, status: 'OPEN' as const },
    { customerIdx: 3, subject: 'Request for IP change', description: 'Need a static IP change for our business server. Current IP conflicts with internal network.', category: 'Technical', priority: 'LOW' as const, status: 'RESOLVED' as const },
    { customerIdx: 4, subject: 'Frequent disconnections', description: 'Internet drops every 2-3 hours and takes 5 minutes to reconnect. Happening for the past week.', category: 'Technical', priority: 'CRITICAL' as const, status: 'IN_PROGRESS' as const },
    { customerIdx: 5, subject: 'Upgrade package request', description: 'I would like to upgrade from Standard to Premium package. What are the steps?', category: 'Sales', priority: 'LOW' as const, status: 'RESOLVED' as const },
    { customerIdx: 7, subject: 'Router replacement needed', description: 'Router making loud buzzing noise and overheating. Need a replacement.', category: 'Hardware', priority: 'HIGH' as const, status: 'OPEN' as const },
    { customerIdx: 9, subject: 'New connection installation', description: 'Need to install a second connection at my office address. Same package as home.', category: 'Installation', priority: 'MEDIUM' as const, status: 'PENDING_CUSTOMER' as const },
    { customerIdx: 10, subject: 'Payment method update', description: 'Want to change payment method from cash to bank transfer. Please update my account.', category: 'Billing', priority: 'LOW' as const, status: 'CLOSED' as const },
    { customerIdx: 13, subject: 'Data usage seems high', description: 'My data usage shows 80GB but I barely use the internet. Could there be unauthorized access?', category: 'Technical', priority: 'HIGH' as const, status: 'OPEN' as const },
  ];

  let ticketCounter = 1;
  for (const t of ticketData) {
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: `TKT-2026-${String(ticketCounter++).padStart(4, '0')}`,
        customerId: customers[t.customerIdx].id,
        subject: t.subject,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        assignedTo: t.status !== 'OPEN' ? adminUser.id : null,
        openedAt: daysAgo(Math.floor(Math.random() * 14) + 1),
        resolvedAt: t.status === 'RESOLVED' || t.status === 'CLOSED' ? daysAgo(Math.floor(Math.random() * 3)) : null,
        closedAt: t.status === 'CLOSED' ? daysAgo(1) : null,
      },
    });

    // Add replies to non-open tickets
    if (t.status !== 'OPEN') {
      await prisma.ticketReply.create({
        data: {
          ticketId: ticket.id,
          userId: adminUser.id,
          message: 'Thank you for reaching out. We are looking into this issue and will update you shortly.',
          isInternal: false,
        },
      });

      if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        await prisma.ticketReply.create({
          data: {
            ticketId: ticket.id,
            userId: adminUser.id,
            message: 'This issue has been resolved. Please let us know if you experience any further problems.',
            isInternal: false,
          },
        });
      }
    }
  }

  // ═══════════════════════════════════════════
  // 8. SYNC LOGS
  // ═══════════════════════════════════════════
  console.log('Seeding sync logs...');
  for (const router of [router1, router2, router3]) {
    for (let i = 0; i < 5; i++) {
      const success = Math.random() > 0.2;
      await prisma.syncLog.create({
        data: {
          routerId: router.id,
          syncType: 'full',
          direction: 'MIKROTIK_TO_CRM',
          status: success ? 'SUCCESS' : 'FAILED',
          startedAt: daysAgo(i * 2),
          completedAt: daysAgo(i * 2),
          recordsProcessed: success ? Math.floor(Math.random() * 50) + 10 : 0,
          recordsCreated: success ? Math.floor(Math.random() * 5) : 0,
          recordsUpdated: success ? Math.floor(Math.random() * 10) : 0,
          recordsFailed: success ? 0 : Math.floor(Math.random() * 3) + 1,
          errorMessage: success ? null : 'Connection timeout - router unreachable',
          triggeredBy: adminUser.id,
        },
      });
    }
  }

  // ═══════════════════════════════════════════
  // 9. OLT BRANDS, VERSIONS & DEVICES
  // ═══════════════════════════════════════════
  console.log('Seeding OLT brands and versions...');
  const oltBrands = await Promise.all([
    prisma.oLTBrand.create({
      data: { name: 'Huawei', displayName: 'Huawei Technologies', description: 'Leading global provider of ICT infrastructure and smart devices', supportUrl: 'https://support.huawei.com' },
    }),
    prisma.oLTBrand.create({
      data: { name: 'ZTE', displayName: 'ZTE Corporation', description: 'Chinese multinational telecommunications equipment and systems company', supportUrl: 'https://support.zte.com.cn' },
    }),
    prisma.oLTBrand.create({
      data: { name: 'Fiberhome', displayName: 'FiberHome Technologies', description: 'Provider of optical communication equipment and solutions', supportUrl: 'https://www.fiberhome.com' },
    }),
    prisma.oLTBrand.create({
      data: { name: 'Nokia', displayName: 'Nokia Networks', description: 'Finnish multinational telecommunications, IT, and consumer electronics company', supportUrl: 'https://www.nokia.com' },
    }),
  ]);

  const oltVersions = await Promise.all([
    prisma.oLTVersion.create({ data: { version: 'MA5600T V800R017', firmware: 'V800R017C10', oltBrandId: oltBrands[0].id, features: ['GPON', 'EPON', '10G PON'], releaseDate: new Date('2023-06-01') } }),
    prisma.oLTVersion.create({ data: { version: 'MA5800 V800R020', firmware: 'V800R020C00', oltBrandId: oltBrands[0].id, features: ['XG-PON', 'XGS-PON', 'NG-PON2'], releaseDate: new Date('2024-01-15') } }),
    prisma.oLTVersion.create({ data: { version: 'C320 V3.2', firmware: 'V3.2.1', oltBrandId: oltBrands[1].id, features: ['GPON', 'EPON'], releaseDate: new Date('2023-09-10') } }),
    prisma.oLTVersion.create({ data: { version: 'C600 V2.0', firmware: 'V2.0.5', oltBrandId: oltBrands[1].id, features: ['XG-PON', 'XGS-PON'], releaseDate: new Date('2024-03-20') } }),
    prisma.oLTVersion.create({ data: { version: 'AN5506-04-F', firmware: 'V1.2.3', oltBrandId: oltBrands[2].id, features: ['GPON'], releaseDate: new Date('2023-11-05') } }),
    prisma.oLTVersion.create({ data: { version: 'ISAM 7360 FX', firmware: 'R8.1.2', oltBrandId: oltBrands[3].id, features: ['XGS-PON', 'NG-PON2'], releaseDate: new Date('2024-02-28') } }),
  ]);

  console.log('Creating OLTs...');
  const sampleOlts = await Promise.all([
    prisma.oLT.create({
      data: {
        name: 'Main-Office-OLT-01', location: 'Main Office - Floor 3', ipAddress: '192.168.1.100', serialNumber: 'HUW123456789',
        status: 'ACTIVE', oltBrandId: oltBrands[0].id, oltVersionId: oltVersions[0].id, ponTechnology: 'GPON',
        maxCapacity: 128, currentLoad: 45, cpuUsage: 15.5, ramUsage: 32.8, temperature: 42.3,
        latitude: 40.7128, longitude: -74.006, address: '123 Main St, New York, NY 10001',
        managementInterface: 'eth0', snmpCommunity: 'public', sshPort: 22,
        maintenanceMode: false, autoProvisioning: true, createdBy: adminUser.id, lastSyncAt: new Date(),
      },
    }),
    prisma.oLT.create({
      data: {
        name: 'Branch-Office-OLT-01', location: 'Branch Office - Server Room', ipAddress: '192.168.2.50', serialNumber: 'ZTE987654321',
        status: 'ACTIVE', oltBrandId: oltBrands[1].id, oltVersionId: oltVersions[2].id, ponTechnology: 'XG_PON',
        maxCapacity: 64, currentLoad: 28, cpuUsage: 22.1, ramUsage: 41.5, temperature: 38.7,
        latitude: 40.758, longitude: -73.9855, address: '456 Broadway, New York, NY 10013',
        managementInterface: 'eth0', snmpCommunity: 'public', sshPort: 22,
        maintenanceMode: false, autoProvisioning: true, createdBy: adminUser.id, lastSyncAt: new Date(),
      },
    }),
    prisma.oLT.create({
      data: {
        name: 'DataCenter-OLT-01', location: 'Data Center - Rack A12', ipAddress: '10.0.1.25', serialNumber: 'FHM555111222',
        status: 'PENDING', oltBrandId: oltBrands[2].id, oltVersionId: oltVersions[4].id, ponTechnology: 'GPON',
        maxCapacity: 256, currentLoad: 0, cpuUsage: 0, ramUsage: 0,
        latitude: 40.7614, longitude: -73.9776, address: '789 5th Ave, New York, NY 10019',
        managementInterface: 'eth0', snmpCommunity: 'public', sshPort: 22,
        maintenanceMode: false, autoProvisioning: true, createdBy: adminUser.id,
      },
    }),
  ]);

  console.log('Creating OLT ports...');
  const ports = [];
  for (let i = 1; i <= 16; i++) {
    ports.push({
      oltId: sampleOlts[0].id, portNumber: i, portType: 'PON' as const,
      status: (i <= 8 ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE',
      powerLevel: -15.5 + (Math.random() * 10 - 5),
      signalStrength: -20.3 + (Math.random() * 8 - 4),
      snr: 25.8 + (Math.random() * 10 - 5),
      enabled: i <= 8,
      vlanId: i <= 8 ? 100 + i : null,
    });
  }
  for (let i = 1; i <= 8; i++) {
    ports.push({
      oltId: sampleOlts[1].id, portNumber: i, portType: 'PON' as const,
      status: (i <= 5 ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE',
      powerLevel: -16.2 + (Math.random() * 8 - 4),
      signalStrength: -21.1 + (Math.random() * 6 - 3),
      snr: 24.5 + (Math.random() * 8 - 4),
      enabled: i <= 5,
      vlanId: i <= 5 ? 200 + i : null,
    });
  }
  await prisma.oLTPort.createMany({ data: ports });

  console.log('Creating ONUs...');
  const createdPorts = await prisma.oLTPort.findMany({ where: { oltId: sampleOlts[0].id, status: 'ACTIVE' }, take: 6 });
  for (let i = 0; i < Math.min(6, createdPorts.length); i++) {
    await prisma.onu.create({
      data: {
        serialNumber: `ONU-${String(i + 1).padStart(6, '0')}`,
        macAddress: `CC:DD:EE:FF:00:${String(i + 1).padStart(2, '0')}`,
        oltId: sampleOlts[0].id,
        portId: createdPorts[i].id,
        onuModel: ['HG8245H', 'HG8546M', 'F670L', 'GM620'][i % 4],
        onuBrand: ['Huawei', 'Huawei', 'ZTE', 'Nokia'][i % 4],
        status: i < 5 ? 'ACTIVE' : 'PROVISIONING',
        powerLevel: -18.5 + Math.random() * 6,
        distance: Math.floor(Math.random() * 15000) + 500,
        temperature: 35 + Math.random() * 15,
        vlanId: 100 + i + 1,
        speedProfile: ['50M/25M', '100M/50M', '25M/10M'][i % 3],
        autoProvisioned: i < 3,
        customerId: i < customers.length ? customers[i].id : null,
        address: customersData[i]?.address || null,
        installationDate: daysAgo(Math.floor(Math.random() * 90) + 10),
        lastSeen: i < 5 ? new Date() : daysAgo(1),
      },
    });
  }

  console.log('Creating OLT alerts...');
  await Promise.all([
    prisma.oLTAlert.create({ data: { oltId: sampleOlts[0].id, alertType: 'SIGNAL_LOW', severity: 'MEDIUM', title: 'Low Signal on Port 5', description: 'Signal level below threshold on port 5', value: -28.5, threshold: -25.0, status: 'ACTIVE' } }),
    prisma.oLTAlert.create({ data: { oltId: sampleOlts[1].id, alertType: 'CPU_HIGH', severity: 'LOW', title: 'High CPU Usage', description: 'CPU usage above normal threshold', value: 22.1, threshold: 20.0, status: 'ACTIVE' } }),
    prisma.oLTAlert.create({ data: { oltId: sampleOlts[0].id, alertType: 'TEMPERATURE_HIGH', severity: 'HIGH', title: 'Temperature Warning', description: 'Device temperature approaching critical level', value: 65.2, threshold: 60.0, status: 'ACKNOWLEDGED', acknowledged: true, acknowledgedBy: adminUser.id, acknowledgedAt: daysAgo(1) } }),
  ]);

  console.log('Creating maintenance schedules...');
  await Promise.all([
    prisma.maintenanceSchedule.create({ data: { oltId: sampleOlts[0].id, title: 'Firmware Upgrade - MA5600T', description: 'Scheduled firmware upgrade to V800R018', scheduledFor: daysFromNow(7), duration: 120, type: 'FIRMWARE_UPGRADE', status: 'SCHEDULED', performedBy: adminUser.id } }),
    prisma.maintenanceSchedule.create({ data: { oltId: sampleOlts[1].id, title: 'Quarterly Inspection', description: 'Routine quarterly hardware inspection and cleaning', scheduledFor: daysFromNow(14), duration: 60, type: 'INSPECTION', status: 'SCHEDULED', performedBy: adminUser.id } }),
  ]);

  // ═══════════════════════════════════════════
  // 10. INVENTORY
  // ═══════════════════════════════════════════
  console.log('Seeding inventory categories...');
  const invCategories: Record<string, any> = {};
  for (const cat of ['Router', 'ONU', 'Cable', 'Splitter', 'Patch Cord', 'Connector', 'Tool', 'Other']) {
    invCategories[cat] = await prisma.inventoryCategory.create({ data: { name: cat } });
  }

  console.log('Seeding inventory items...');
  const inventoryItems = await Promise.all([
    prisma.inventoryItem.create({ data: { name: 'Huawei HG8245H ONU', sku: 'ONU-HW-8245H', categoryId: invCategories['ONU'].id, brand: 'Huawei', model: 'HG8245H', unitCost: 35.00, minStockThreshold: 20, totalQuantity: 150, inStockCount: 80, deployedCount: 55, damagedCount: 10, inRepairCount: 5, createdBy: adminUser.id } }),
    prisma.inventoryItem.create({ data: { name: 'ZTE F670L ONU', sku: 'ONU-ZTE-F670L', categoryId: invCategories['ONU'].id, brand: 'ZTE', model: 'F670L', unitCost: 28.00, minStockThreshold: 15, totalQuantity: 100, inStockCount: 45, deployedCount: 40, damagedCount: 8, inRepairCount: 7, createdBy: adminUser.id } }),
    prisma.inventoryItem.create({ data: { name: 'MikroTik hAP ac2', sku: 'RTR-MT-HAP2', categoryId: invCategories['Router'].id, brand: 'MikroTik', model: 'hAP ac2', unitCost: 55.00, minStockThreshold: 10, totalQuantity: 60, inStockCount: 25, deployedCount: 30, damagedCount: 3, inRepairCount: 2, createdBy: adminUser.id } }),
    prisma.inventoryItem.create({ data: { name: 'MikroTik RB750Gr3', sku: 'RTR-MT-750G3', categoryId: invCategories['Router'].id, brand: 'MikroTik', model: 'RB750Gr3', unitCost: 45.00, minStockThreshold: 8, totalQuantity: 40, inStockCount: 15, deployedCount: 20, damagedCount: 3, inRepairCount: 2, createdBy: adminUser.id } }),
    prisma.inventoryItem.create({ data: { name: 'Fiber Optic Cable 1km GYXTW', sku: 'CBL-FO-1KM', categoryId: invCategories['Cable'].id, brand: 'Generic', unitCost: 120.00, minStockThreshold: 5, totalQuantity: 30, inStockCount: 12, deployedCount: 18, damagedCount: 0, inRepairCount: 0, createdBy: adminUser.id } }),
    prisma.inventoryItem.create({ data: { name: 'Drop Cable 200m FTTH', sku: 'CBL-DROP-200', categoryId: invCategories['Cable'].id, brand: 'Generic', unitCost: 15.00, minStockThreshold: 50, totalQuantity: 200, inStockCount: 35, deployedCount: 160, damagedCount: 5, inRepairCount: 0, description: 'Single-mode FTTH drop cable', createdBy: adminUser.id } }),
    prisma.inventoryItem.create({ data: { name: 'PLC Splitter 1:8', sku: 'SPL-PLC-1-8', categoryId: invCategories['Splitter'].id, brand: 'Generic', unitCost: 8.00, minStockThreshold: 30, totalQuantity: 100, inStockCount: 40, deployedCount: 55, damagedCount: 5, inRepairCount: 0, createdBy: adminUser.id } }),
    prisma.inventoryItem.create({ data: { name: 'PLC Splitter 1:16', sku: 'SPL-PLC-1-16', categoryId: invCategories['Splitter'].id, brand: 'Generic', unitCost: 15.00, minStockThreshold: 15, totalQuantity: 50, inStockCount: 18, deployedCount: 28, damagedCount: 4, inRepairCount: 0, createdBy: adminUser.id } }),
    prisma.inventoryItem.create({ data: { name: 'SC/APC Patch Cord 3m', sku: 'PC-SCAPC-3M', categoryId: invCategories['Patch Cord'].id, brand: 'Generic', unitCost: 2.50, minStockThreshold: 100, totalQuantity: 500, inStockCount: 180, deployedCount: 300, damagedCount: 20, inRepairCount: 0, createdBy: adminUser.id } }),
    prisma.inventoryItem.create({ data: { name: 'SC/UPC Connector', sku: 'CON-SCUPC', categoryId: invCategories['Connector'].id, brand: 'Generic', unitCost: 0.50, minStockThreshold: 200, totalQuantity: 1000, inStockCount: 350, deployedCount: 600, damagedCount: 50, inRepairCount: 0, createdBy: adminUser.id } }),
    prisma.inventoryItem.create({ data: { name: 'OTDR Fiber Tester', sku: 'TOOL-OTDR-01', categoryId: invCategories['Tool'].id, brand: 'EXFO', model: 'MaxTester 730C', unitCost: 3500.00, minStockThreshold: 1, totalQuantity: 3, inStockCount: 1, deployedCount: 2, damagedCount: 0, inRepairCount: 0, createdBy: adminUser.id } }),
    prisma.inventoryItem.create({ data: { name: 'Fusion Splicer', sku: 'TOOL-SPLICE-01', categoryId: invCategories['Tool'].id, brand: 'Fujikura', model: '70S+', unitCost: 5000.00, minStockThreshold: 1, totalQuantity: 2, inStockCount: 1, deployedCount: 1, damagedCount: 0, inRepairCount: 0, createdBy: adminUser.id } }),
  ]);

  // Sample transactions
  for (const item of inventoryItems.slice(0, 5)) {
    await prisma.inventoryTransaction.create({ data: { itemId: item.id, type: 'PURCHASE_IN', quantity: 50, previousQty: 0, newQty: 50, condition: 'NEW', reference: 'Initial stock', performedBy: adminUser.id } });
    await prisma.inventoryTransaction.create({ data: { itemId: item.id, type: 'DEPLOY_OUT', quantity: 5, previousQty: 50, newQty: 45, condition: 'NEW', customerId: customers[0].id, notes: 'Customer installation', performedBy: adminUser.id } });
  }

  // Sample purchase order
  const po = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2026-00001',
      supplier: 'Huawei Technologies',
      supplierContact: 'Sales Team',
      supplierEmail: 'sales@huawei-dist.com',
      status: 'ORDERED',
      orderDate: daysAgo(5),
      expectedDate: daysFromNow(10),
      totalAmount: 3500,
      notes: 'Monthly ONU restock order',
      createdBy: adminUser.id,
      items: {
        create: [
          { inventoryItemId: inventoryItems[0].id, quantity: 50, unitCost: 35.00, totalCost: 1750 },
          { inventoryItemId: inventoryItems[1].id, quantity: 50, unitCost: 28.00, totalCost: 1400 },
          { inventoryItemId: inventoryItems[8].id, quantity: 100, unitCost: 2.50, totalCost: 250 },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2026-00002',
      supplier: 'MikroTik Distributor',
      supplierContact: 'John',
      supplierEmail: 'orders@mikrotik-dist.com',
      status: 'DRAFT',
      totalAmount: 2750,
      notes: 'Router restock',
      createdBy: adminUser.id,
      items: {
        create: [
          { inventoryItemId: inventoryItems[2].id, quantity: 30, unitCost: 55.00, totalCost: 1650 },
          { inventoryItemId: inventoryItems[3].id, quantity: 20, unitCost: 45.00, totalCost: 900 },
        ],
      },
    },
  });

  // ═══════════════════════════════════════════
  // 11. RBAC — Permissions & Role Mappings
  // ═══════════════════════════════════════════
  console.log('Seeding RBAC permissions and roles...');

  // All permissions grouped by resource
  const permissionsDef: { name: string; resource: string; action: string; description: string }[] = [
    // Profile
    { name: 'getProfile', resource: 'profile', action: 'read', description: 'View own profile' },
    { name: 'updateProfile', resource: 'profile', action: 'update', description: 'Update own profile' },
    { name: 'getPreferences', resource: 'profile', action: 'readPreferences', description: 'View preferences' },
    { name: 'updatePreferences', resource: 'profile', action: 'updatePreferences', description: 'Update preferences' },
    { name: 'getPrivacySettings', resource: 'profile', action: 'readPrivacy', description: 'View privacy settings' },
    { name: 'updatePrivacySettings', resource: 'profile', action: 'updatePrivacy', description: 'Update privacy settings' },
    { name: 'getAccountStatus', resource: 'profile', action: 'readStatus', description: 'View account status' },
    { name: 'getUserStats', resource: 'profile', action: 'readStats', description: 'View user stats' },
    { name: 'getUserActivity', resource: 'profile', action: 'readActivity', description: 'View user activity' },
    { name: 'getActivityStats', resource: 'profile', action: 'readActivityStats', description: 'View activity statistics' },
    { name: 'exportUserData', resource: 'profile', action: 'export', description: 'Export user data' },
    { name: 'deleteAccount', resource: 'profile', action: 'delete', description: 'Delete own account' },
    { name: 'uploadAvatar', resource: 'profile', action: 'uploadAvatar', description: 'Upload avatar' },
    { name: 'removeAvatar', resource: 'profile', action: 'removeAvatar', description: 'Remove avatar' },
    // Devices
    { name: 'getUserDevices', resource: 'devices', action: 'read', description: 'View user devices' },
    { name: 'getDeviceSessions', resource: 'devices', action: 'readSessions', description: 'View device sessions' },
    { name: 'trustDevice', resource: 'devices', action: 'trust', description: 'Trust a device' },
    { name: 'removeDevice', resource: 'devices', action: 'remove', description: 'Remove a device' },
    { name: 'removeAllOtherDevices', resource: 'devices', action: 'removeAll', description: 'Remove all other devices' },
    // Notifications
    { name: 'getUserNotifications', resource: 'notifications', action: 'read', description: 'View notifications' },
    { name: 'markNotificationAsRead', resource: 'notifications', action: 'markRead', description: 'Mark notification as read' },
    { name: 'markAllNotificationsAsRead', resource: 'notifications', action: 'markAllRead', description: 'Mark all notifications as read' },
    { name: 'deleteNotification', resource: 'notifications', action: 'delete', description: 'Delete notification' },
    { name: 'deleteReadNotifications', resource: 'notifications', action: 'deleteRead', description: 'Delete read notifications' },
    { name: 'getNotificationStats', resource: 'notifications', action: 'readStats', description: 'View notification stats' },
    // Security
    { name: 'getSecurityLogs', resource: 'security', action: 'readLogs', description: 'View security logs' },
    { name: 'getSecurityStats', resource: 'security', action: 'readStats', description: 'View security stats' },
    // Two-Factor
    { name: 'setupTwoFactor', resource: 'twoFactor', action: 'setup', description: 'Setup 2FA' },
    { name: 'enableTwoFactor', resource: 'twoFactor', action: 'enable', description: 'Enable 2FA' },
    { name: 'disableTwoFactor', resource: 'twoFactor', action: 'disable', description: 'Disable 2FA' },
    { name: 'getTwoFactorStatus', resource: 'twoFactor', action: 'readStatus', description: 'View 2FA status' },
    { name: 'regenerateBackupCodes', resource: 'twoFactor', action: 'regenerateCodes', description: 'Regenerate backup codes' },
    // User Management (admin)
    { name: 'getUsers', resource: 'users', action: 'read', description: 'View all users' },
    { name: 'manageUsers', resource: 'users', action: 'manage', description: 'Create/update users' },
    { name: 'getUserProfile', resource: 'users', action: 'readProfile', description: 'View any user profile' },
    { name: 'updateUserProfile', resource: 'users', action: 'updateProfile', description: 'Update any user profile' },
    { name: 'getUserPreferences', resource: 'users', action: 'readPreferences', description: 'View any user preferences' },
    { name: 'updateUserPreferences', resource: 'users', action: 'updatePreferences', description: 'Update any user preferences' },
    { name: 'getUsersWithExpiringPasswords', resource: 'users', action: 'readExpiring', description: 'View users with expiring passwords' },
    { name: 'getLockedUsers', resource: 'users', action: 'readLocked', description: 'View locked users' },
    { name: 'unlockUserAccount', resource: 'users', action: 'unlock', description: 'Unlock user accounts' },
    { name: 'forcePasswordChange', resource: 'users', action: 'forcePassword', description: 'Force password change' },
    // System
    { name: 'getDetailedHealthCheck', resource: 'system', action: 'healthCheck', description: 'View detailed system health' },
    // ISP Dashboard
    { name: 'viewISPDashboard', resource: 'ispDashboard', action: 'read', description: 'View ISP dashboard' },
    // Customers
    { name: 'manageCustomers', resource: 'customers', action: 'manage', description: 'Create/update customers' },
    { name: 'deleteCustomer', resource: 'customers', action: 'delete', description: 'Delete customers' },
    // Routers
    { name: 'manageRouters', resource: 'routers', action: 'manage', description: 'Create/update routers' },
    { name: 'deleteRouter', resource: 'routers', action: 'delete', description: 'Delete routers' },
    { name: 'viewRouterLogs', resource: 'routers', action: 'readLogs', description: 'View router logs' },
    // Packages
    { name: 'managePackages', resource: 'packages', action: 'manage', description: 'Create/update packages' },
    { name: 'deletePackage', resource: 'packages', action: 'delete', description: 'Delete packages' },
    // Resellers
    { name: 'manageResellers', resource: 'resellers', action: 'manage', description: 'Create/update resellers' },
    { name: 'deleteReseller', resource: 'resellers', action: 'delete', description: 'Delete resellers' },
    // Invoices
    { name: 'manageInvoices', resource: 'invoices', action: 'manage', description: 'Create/update invoices' },
    // Tickets
    { name: 'manageTickets', resource: 'tickets', action: 'manage', description: 'Create/update tickets' },
    // OLT
    { name: 'viewOltDashboard', resource: 'olt', action: 'readDashboard', description: 'View OLT dashboard' },
    { name: 'manageOlts', resource: 'olt', action: 'manage', description: 'Create/update OLTs' },
    { name: 'deleteOlt', resource: 'olt', action: 'delete', description: 'Delete OLTs' },
    // Inventory
    { name: 'manageInventory', resource: 'inventory', action: 'manage', description: 'Manage inventory items and transactions' },
    { name: 'deleteInventory', resource: 'inventory', action: 'delete', description: 'Delete inventory items' },
    { name: 'managePurchaseOrders', resource: 'inventory', action: 'managePO', description: 'Manage purchase orders' },
  ];

  // Create all permissions
  const permMap = new Map<string, string>(); // name -> id
  for (const p of permissionsDef) {
    const perm = await prisma.permissionModel.create({ data: p });
    permMap.set(p.name, perm.id);
  }

  // Role -> permission mapping (matches roles.ts)
  const rolePermissions: Record<string, string[]> = {
    USER: [
      'getProfile', 'updateProfile', 'getPreferences', 'updatePreferences',
      'getPrivacySettings', 'updatePrivacySettings', 'getAccountStatus', 'getUserStats',
      'getUserActivity', 'getActivityStats', 'getUserDevices', 'getDeviceSessions',
      'trustDevice', 'removeDevice', 'removeAllOtherDevices', 'getUserNotifications',
      'markNotificationAsRead', 'markAllNotificationsAsRead', 'deleteNotification',
      'deleteReadNotifications', 'getNotificationStats', 'getSecurityLogs', 'getSecurityStats',
      'exportUserData', 'deleteAccount', 'uploadAvatar', 'removeAvatar',
      'setupTwoFactor', 'enableTwoFactor', 'disableTwoFactor', 'getTwoFactorStatus', 'regenerateBackupCodes',
    ],
    ADMIN: [
      'getProfile', 'updateProfile', 'getPreferences', 'updatePreferences',
      'getPrivacySettings', 'updatePrivacySettings', 'getAccountStatus', 'getUserStats',
      'getUserActivity', 'getActivityStats', 'getUserDevices', 'getDeviceSessions',
      'trustDevice', 'removeDevice', 'removeAllOtherDevices', 'getUserNotifications',
      'markNotificationAsRead', 'markAllNotificationsAsRead', 'deleteNotification',
      'deleteReadNotifications', 'getNotificationStats', 'getSecurityLogs', 'getSecurityStats',
      'exportUserData', 'deleteAccount', 'uploadAvatar', 'removeAvatar',
      'setupTwoFactor', 'enableTwoFactor', 'disableTwoFactor', 'getTwoFactorStatus', 'regenerateBackupCodes',
      'getUsers', 'manageUsers', 'getUserProfile', 'updateUserProfile', 'getUserPreferences', 'updateUserPreferences',
      'getUsersWithExpiringPasswords', 'getLockedUsers', 'unlockUserAccount', 'forcePasswordChange', 'getDetailedHealthCheck',
      'viewISPDashboard', 'manageCustomers', 'deleteCustomer', 'manageRouters', 'deleteRouter',
      'managePackages', 'deletePackage', 'manageResellers', 'deleteReseller',
      'manageInvoices', 'manageTickets', 'viewRouterLogs',
      'viewOltDashboard', 'manageOlts', 'deleteOlt',
      'manageInventory', 'deleteInventory', 'managePurchaseOrders',
    ],
    SUPER_ADMIN: [
      'getProfile', 'updateProfile', 'getPreferences', 'updatePreferences',
      'getPrivacySettings', 'updatePrivacySettings', 'getAccountStatus', 'getUserStats',
      'getUserActivity', 'getActivityStats', 'getUserDevices', 'getDeviceSessions',
      'trustDevice', 'removeDevice', 'removeAllOtherDevices', 'getUserNotifications',
      'markNotificationAsRead', 'markAllNotificationsAsRead', 'deleteNotification',
      'deleteReadNotifications', 'getNotificationStats', 'getSecurityLogs', 'getSecurityStats',
      'exportUserData', 'deleteAccount', 'uploadAvatar', 'removeAvatar',
      'setupTwoFactor', 'enableTwoFactor', 'disableTwoFactor', 'getTwoFactorStatus', 'regenerateBackupCodes',
      'getUsers', 'manageUsers', 'getUserProfile', 'updateUserProfile', 'getUserPreferences', 'updateUserPreferences',
      'getUsersWithExpiringPasswords', 'getLockedUsers', 'unlockUserAccount', 'forcePasswordChange', 'getDetailedHealthCheck',
      'viewISPDashboard', 'manageCustomers', 'deleteCustomer', 'manageRouters', 'deleteRouter',
      'managePackages', 'deletePackage', 'manageResellers', 'deleteReseller',
      'manageInvoices', 'manageTickets', 'viewRouterLogs',
      'viewOltDashboard', 'manageOlts', 'deleteOlt',
      'manageInventory', 'deleteInventory', 'managePurchaseOrders',
    ],
    MANAGER: [
      'getProfile', 'updateProfile', 'getUserDevices',
      'setupTwoFactor', 'enableTwoFactor', 'disableTwoFactor', 'getTwoFactorStatus',
      'viewISPDashboard', 'manageCustomers', 'manageRouters', 'managePackages',
      'manageResellers', 'manageInvoices', 'manageTickets', 'viewRouterLogs',
      'viewOltDashboard', 'manageOlts',
      'manageInventory', 'managePurchaseOrders',
    ],
    SUPPORT: [
      'getProfile', 'updateProfile', 'getUserDevices',
      'setupTwoFactor', 'enableTwoFactor', 'disableTwoFactor', 'getTwoFactorStatus',
      'viewISPDashboard', 'manageCustomers', 'manageTickets', 'manageInvoices', 'viewRouterLogs',
    ],
    FIELD_TECHNICIAN: [
      'getProfile', 'updateProfile', 'getUserDevices',
      'setupTwoFactor', 'enableTwoFactor', 'disableTwoFactor', 'getTwoFactorStatus',
      'viewISPDashboard', 'manageCustomers', 'manageRouters', 'viewRouterLogs',
      'viewOltDashboard', 'manageOlts', 'manageInventory',
    ],
    ENGINEER: [
      'getProfile', 'updateProfile', 'getUserDevices',
      'setupTwoFactor', 'enableTwoFactor', 'disableTwoFactor', 'getTwoFactorStatus',
      'viewISPDashboard', 'manageCustomers', 'manageRouters', 'managePackages', 'viewRouterLogs',
      'viewOltDashboard', 'manageOlts', 'manageInventory',
    ],
    RESELLER: ['viewISPDashboard', 'manageCustomers', 'manageInvoices', 'manageTickets'],
    CUSTOMER: ['viewISPDashboard'],
  };

  // Create RoleModel records and link permissions
  for (const [roleName, perms] of Object.entries(rolePermissions)) {
    const role = await prisma.roleModel.create({
      data: {
        name: roleName,
        description: `Default ${roleName} role`,
        isActive: true,
      },
    });

    const permLinks = perms
      .filter(p => permMap.has(p))
      .map(p => ({ roleId: role.id, permissionId: permMap.get(p)! }));

    if (permLinks.length > 0) {
      await prisma.rolePermission.createMany({ data: permLinks, skipDuplicates: true });
    }
  }

  const totalPerms = permissionsDef.length;
  const totalRoles = Object.keys(rolePermissions).length;

  console.log('Database seeding completed!');
  console.log(`  - Users: 5 (admin, super_admin, 2 resellers, 1 customer)`);
  console.log(`  - Routers: 4`);
  console.log(`  - Packages: 6`);
  console.log(`  - Resellers: 2`);
  console.log(`  - Customers: ${customers.length}`);
  console.log(`  - Invoices: ${activeCustomers.length * 3}`);
  console.log(`  - Tickets: ${ticketData.length}`);
  console.log(`  - OLTs: 3, Ports: ${ports.length}, ONUs: 6`);
  console.log(`  - Inventory: ${inventoryItems.length} items, 2 purchase orders`);
  console.log(`  - RBAC: ${totalRoles} roles, ${totalPerms} permissions`);
}

main()
  .catch(e => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
