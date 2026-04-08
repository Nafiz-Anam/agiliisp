import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding OLT data...');

  // Check if OLT brands already exist
  const existingBrands = await prisma.oLTBrand.count();
  if (existingBrands > 0) {
    console.log('OLT brands already exist. Skipping OLT seeding.');
    return;
  }

  // Get admin user for createdBy field
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!adminUser) {
    console.log('No admin user found. Please create an admin user first.');
    return;
  }

  console.log('Creating OLT brands...');
  
  // Create OLT brands
  const oltBrands = await Promise.all([
    prisma.oLTBrand.create({
      data: {
        name: 'Huawei',
        displayName: 'Huawei Technologies',
        description: 'Leading global provider of ICT infrastructure and smart devices',
        supportUrl: 'https://support.huawei.com',
      },
    }),
    prisma.oLTBrand.create({
      data: {
        name: 'ZTE',
        displayName: 'ZTE Corporation',
        description: 'Chinese multinational telecommunications equipment and systems company',
        supportUrl: 'https://support.zte.com.cn',
      },
    }),
    prisma.oLTBrand.create({
      data: {
        name: 'Fiberhome',
        displayName: 'FiberHome Technologies',
        description: 'Provider of optical communication equipment and solutions',
        supportUrl: 'https://www.fiberhome.com',
      },
    }),
    prisma.oLTBrand.create({
      data: {
        name: 'Nokia',
        displayName: 'Nokia Networks',
        description: 'Finnish multinational telecommunications, information technology, and consumer electronics company',
        supportUrl: 'https://www.nokia.com',
      },
    }),
  ]);

  console.log('Creating OLT versions...');
  
  // Create OLT versions
  const oltVersions = await Promise.all([
    // Huawei versions
    prisma.oLTVersion.create({
      data: {
        version: 'MA5600T V800R017',
        firmware: 'V800R017C10',
        oltBrandId: oltBrands[0].id,
        features: ['GPON', 'EPON', '10G PON'],
        releaseDate: new Date('2023-06-01'),
      },
    }),
    prisma.oLTVersion.create({
      data: {
        version: 'MA5800 V800R020',
        firmware: 'V800R020C00',
        oltBrandId: oltBrands[0].id,
        features: ['XG_PON', 'XGS_PON', 'NG_PON2'],
        releaseDate: new Date('2024-01-15'),
      },
    }),
    // ZTE versions
    prisma.oLTVersion.create({
      data: {
        version: 'C320 V3.2',
        firmware: 'V3.2.1',
        oltBrandId: oltBrands[1].id,
        features: ['GPON', 'EPON'],
        releaseDate: new Date('2023-09-10'),
      },
    }),
    prisma.oLTVersion.create({
      data: {
        version: 'C600 V2.0',
        firmware: 'V2.0.5',
        oltBrandId: oltBrands[1].id,
        features: ['XG_PON', 'XGS_PON'],
        releaseDate: new Date('2024-03-20'),
      },
    }),
    // Fiberhome versions
    prisma.oLTVersion.create({
      data: {
        version: 'AN5506-04-F',
        firmware: 'V1.2.3',
        oltBrandId: oltBrands[2].id,
        features: ['GPON'],
        releaseDate: new Date('2023-11-05'),
      },
    }),
    // Nokia versions
    prisma.oLTVersion.create({
      data: {
        version: 'ISAM 7360 FX',
        firmware: 'R8.1.2',
        oltBrandId: oltBrands[3].id,
        features: ['XGS_PON', 'NG_PON2'],
        releaseDate: new Date('2024-02-28'),
      },
    }),
  ]);

  console.log('Creating sample OLTs...');
  
  // Create sample OLTs
  const sampleOlts = await Promise.all([
    prisma.oLT.create({
      data: {
        name: 'Main-Office-OLT-01',
        location: 'Main Office - Floor 3',
        ipAddress: '192.168.1.100',
        serialNumber: 'HUW123456789',
        status: 'ACTIVE',
        oltBrandId: oltBrands[0].id,
        oltVersionId: oltVersions[0].id,
        ponTechnology: 'GPON',
        maxCapacity: 128,
        currentLoad: 45,
        cpuUsage: 15.5,
        ramUsage: 32.8,
        temperature: 42.3,
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St, New York, NY 10001',
        managementInterface: 'eth0',
        snmpCommunity: 'public',
        sshPort: 22,
        maintenanceMode: false,
        autoProvisioning: true,
        createdBy: adminUser.id,
        lastSyncAt: new Date(),
      },
    }),
    prisma.oLT.create({
      data: {
        name: 'Branch-Office-OLT-01',
        location: 'Branch Office - Server Room',
        ipAddress: '192.168.2.50',
        serialNumber: 'ZTE987654321',
        status: 'ACTIVE',
        oltBrandId: oltBrands[1].id,
        oltVersionId: oltVersions[2].id,
        ponTechnology: 'XG_PON',
        maxCapacity: 64,
        currentLoad: 28,
        cpuUsage: 22.1,
        ramUsage: 41.5,
        temperature: 38.7,
        latitude: 40.7580,
        longitude: -73.9855,
        address: '456 Broadway, New York, NY 10013',
        managementInterface: 'eth0',
        snmpCommunity: 'public',
        sshPort: 22,
        maintenanceMode: false,
        autoProvisioning: true,
        createdBy: adminUser.id,
        lastSyncAt: new Date(),
      },
    }),
    prisma.oLT.create({
      data: {
        name: 'DataCenter-OLT-01',
        location: 'Data Center - Rack A12',
        ipAddress: '10.0.1.25',
        serialNumber: 'FHM555111222',
        status: 'PENDING',
        oltBrandId: oltBrands[2].id,
        oltVersionId: oltVersions[4].id,
        ponTechnology: 'GPON',
        maxCapacity: 256,
        currentLoad: 0,
        cpuUsage: 0,
        ramUsage: 0,
        latitude: 40.7614,
        longitude: -73.9776,
        address: '789 5th Ave, New York, NY 10019',
        managementInterface: 'eth0',
        snmpCommunity: 'public',
        sshPort: 22,
        maintenanceMode: false,
        autoProvisioning: true,
        createdBy: adminUser.id,
      },
    }),
  ]);

  console.log('Creating sample OLT ports...');
  
  // Create sample ports for first OLT
  const ports = [];
  for (let i = 1; i <= 16; i++) {
    ports.push({
      oltId: sampleOlts[0].id,
      portNumber: i,
      portType: 'PON',
      status: i <= 8 ? 'ACTIVE' : 'INACTIVE',
      powerLevel: -15.5 + (Math.random() * 10 - 5),
      signalStrength: -20.3 + (Math.random() * 8 - 4),
      snr: 25.8 + (Math.random() * 10 - 5),
      enabled: i <= 8,
      vlanId: i <= 8 ? 100 + i : null,
    });
  }

  await prisma.oLTPort.createMany({ data: ports });

  console.log('Creating sample alerts...');
  
  // Create sample alerts
  await Promise.all([
    prisma.oLTAlert.create({
      data: {
        oltId: sampleOlts[0].id,
        alertType: 'SIGNAL_LOW',
        severity: 'MEDIUM',
        title: 'Low Signal on Port 5',
        description: 'Signal level below threshold on port 5',
        value: -28.5,
        threshold: -25.0,
        status: 'ACTIVE',
      },
    }),
    prisma.oLTAlert.create({
      data: {
        oltId: sampleOlts[1].id,
        alertType: 'CPU_HIGH',
        severity: 'LOW',
        title: 'High CPU Usage',
        description: 'CPU usage above normal threshold',
        value: 22.1,
        threshold: 20.0,
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log('OLT data seeding completed!');
}

main()
  .catch((e) => { console.error('OLT seeding failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
