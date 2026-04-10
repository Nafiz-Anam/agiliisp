import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const db = prisma as any;

async function main() {
  const existing = await db.zone.count();
  if (existing > 0) {
    console.log(`Already have ${existing} zones. Skipping seed.`);
    return;
  }

  console.log('Seeding zones...');

  // ── Division-level ──
  const khulnaDiv = await db.zone.create({
    data: { name: 'Khulna Division', division: 'Khulna', description: 'Khulna divisional coverage' },
  });
  const dhakaDiv = await db.zone.create({
    data: { name: 'Dhaka Division', division: 'Dhaka', description: 'Dhaka divisional coverage' },
  });
  const ctgDiv = await db.zone.create({
    data: { name: 'Chattogram Division', division: 'Chattogram', description: 'Chattogram divisional coverage' },
  });

  // ── Districts under Khulna ──
  const khulnaDist = await db.zone.create({
    data: { name: 'Khulna District', division: 'Khulna', district: 'Khulna', parentId: khulnaDiv.id },
  });
  await db.zone.create({
    data: { name: 'Jashore District', division: 'Khulna', district: 'Jashore', parentId: khulnaDiv.id },
  });
  await db.zone.create({
    data: { name: 'Satkhira District', division: 'Khulna', district: 'Satkhira', parentId: khulnaDiv.id },
  });

  // ── Khulna City metro thanas ──
  const khalishpur = await db.zone.create({
    data: {
      name: 'Khalishpur', division: 'Khulna', district: 'Khulna', upazila: 'Khalishpur',
      parentId: khulnaDist.id,
      coverage: 'Khalishpur Industrial Area, Jute Mills, Newsprint Mill, Power House, BIT Khulna\nWard 7-15',
    },
  });
  const sonadanga = await db.zone.create({
    data: {
      name: 'Sonadanga', division: 'Khulna', district: 'Khulna', upazila: 'Sonadanga',
      parentId: khulnaDist.id,
      coverage: 'Nirala, Gollamari, Boyra, New Market, Shibbari, Mujgunni, Eastern Plaza\nWard 16-20, 25-26',
    },
  });
  await db.zone.create({
    data: {
      name: 'Daulatpur', division: 'Khulna', district: 'Khulna', upazila: 'Daulatpur',
      parentId: khulnaDist.id,
      coverage: 'Maheshwarpasha, Shiramoni, Badamtali, Trade School\nWard 4-6',
    },
  });
  await db.zone.create({
    data: {
      name: 'Kotwali', division: 'Khulna', district: 'Khulna', upazila: 'Kotwali',
      parentId: khulnaDist.id,
      coverage: 'Tutpara, Dolkhola, Khulna Shipyard, Railway Station, Rayer Mahal\nWard 21-24, 27-30',
    },
  });
  await db.zone.create({
    data: {
      name: 'Khan Jahan Ali', division: 'Khulna', district: 'Khulna', upazila: 'Khan Jahan Ali',
      parentId: khulnaDist.id,
      coverage: 'Phulbari Gate, Atra, Jahanabad Cantonment, Satgumbad Mosque',
    },
  });
  await db.zone.create({
    data: {
      name: 'Labanchara', division: 'Khulna', district: 'Khulna', upazila: 'Labanchara',
      parentId: khulnaDist.id,
      coverage: 'Moylapota, Arambag, Gilatola, KDA Avenue\nWard 31',
    },
  });

  // ── Areas under Khalishpur ──
  await db.zone.create({
    data: { name: 'BIT Khulna Area', division: 'Khulna', district: 'Khulna', upazila: 'Khalishpur', area: 'BIT Khulna', parentId: khalishpur.id, coverage: 'BIT campus, surrounding residential area' },
  });
  await db.zone.create({
    data: { name: 'Power House Area', division: 'Khulna', district: 'Khulna', upazila: 'Khalishpur', area: 'Power House', parentId: khalishpur.id, coverage: 'Power House colony, adjacent blocks' },
  });

  // ── Areas under Sonadanga ──
  await db.zone.create({
    data: { name: 'Boyra', division: 'Khulna', district: 'Khulna', upazila: 'Sonadanga', area: 'Boyra', parentId: sonadanga.id, coverage: 'Boro Boyra, Choto Boyra' },
  });
  await db.zone.create({
    data: { name: 'Nirala', division: 'Khulna', district: 'Khulna', upazila: 'Sonadanga', area: 'Nirala', parentId: sonadanga.id, coverage: 'Nirala R/A' },
  });
  await db.zone.create({
    data: { name: 'Gollamari', division: 'Khulna', district: 'Khulna', upazila: 'Sonadanga', area: 'Gollamari', parentId: sonadanga.id },
  });

  // ── Districts under Dhaka ──
  const dhakaDist = await db.zone.create({
    data: { name: 'Dhaka City', division: 'Dhaka', district: 'Dhaka', parentId: dhakaDiv.id },
  });
  await db.zone.create({
    data: { name: 'Gazipur District', division: 'Dhaka', district: 'Gazipur', parentId: dhakaDiv.id },
  });
  await db.zone.create({
    data: { name: 'Narayanganj District', division: 'Dhaka', district: 'Narayanganj', parentId: dhakaDiv.id },
  });

  // ── Dhaka City thanas ──
  await db.zone.create({
    data: { name: 'Mirpur', division: 'Dhaka', district: 'Dhaka', upazila: 'Mirpur Model', parentId: dhakaDist.id, coverage: 'Mirpur-1 to Mirpur-14, Shah Ali Bagh' },
  });
  await db.zone.create({
    data: { name: 'Dhanmondi', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhanmondi', parentId: dhakaDist.id, coverage: 'Dhanmondi R/A, Shankar, Jhigatola, Science Lab' },
  });
  await db.zone.create({
    data: { name: 'Uttara', division: 'Dhaka', district: 'Dhaka', upazila: 'Uttara East', parentId: dhakaDist.id, coverage: 'Sector 1-11, Jasimuddin Road' },
  });
  await db.zone.create({
    data: { name: 'Gulshan', division: 'Dhaka', district: 'Dhaka', upazila: 'Gulshan', parentId: dhakaDist.id, coverage: 'Gulshan-1, Gulshan-2, Niketan, Gulshan Avenue' },
  });
  await db.zone.create({
    data: { name: 'Mohammadpur', division: 'Dhaka', district: 'Dhaka', upazila: 'Mohammadpur', parentId: dhakaDist.id, coverage: 'Tajmahal Road, Jafrabad, Noorjahan Road, Town Hall' },
  });
  await db.zone.create({
    data: { name: 'Banani', division: 'Dhaka', district: 'Dhaka', upazila: 'Banani', parentId: dhakaDist.id, coverage: 'Banani DOHS, Kakoli, Chairman Bari' },
  });
  await db.zone.create({
    data: { name: 'Tejgaon', division: 'Dhaka', district: 'Dhaka', upazila: 'Tejgaon', parentId: dhakaDist.id, coverage: 'Farmgate, Kawran Bazar, Banglamotor, Bijoy Nagar' },
  });

  // ── District under Chattogram ──
  const ctgDist = await db.zone.create({
    data: { name: 'Chattogram City', division: 'Chattogram', district: 'Chattogram', parentId: ctgDiv.id },
  });
  await db.zone.create({
    data: { name: "Cox's Bazar District", division: 'Chattogram', district: "Cox's Bazar", parentId: ctgDiv.id },
  });

  // ── Chattogram City thanas ──
  await db.zone.create({
    data: { name: 'Agrabad', division: 'Chattogram', district: 'Chattogram', upazila: 'Double Mooring', area: 'Agrabad', parentId: ctgDist.id, coverage: 'North Agrabad, South Agrabad, Strand Road' },
  });
  await db.zone.create({
    data: { name: 'GEC Circle', division: 'Chattogram', district: 'Chattogram', upazila: 'Panchlaish', area: 'GEC Circle', parentId: ctgDist.id, coverage: 'Sugandha, O.R. Nizam Road, Prabartak Circle' },
  });
  await db.zone.create({
    data: { name: 'Halishahar', division: 'Chattogram', district: 'Chattogram', upazila: 'Halishahar', parentId: ctgDist.id, coverage: 'Halishahar Housing, Bandartila, CDA Avenue' },
  });
  await db.zone.create({
    data: { name: 'Pahartali', division: 'Chattogram', district: 'Chattogram', upazila: 'Pahartali', parentId: ctgDist.id, coverage: 'Wireless Gate, Battali Hill, Foillatali' },
  });
  await db.zone.create({
    data: { name: 'Nasirabad', division: 'Chattogram', district: 'Chattogram', upazila: 'Bayezid Bostami', area: 'Nasirabad', parentId: ctgDist.id, coverage: 'Nasirabad, East Nasirabad, Nandankanon' },
  });

  const total = await db.zone.count();
  console.log(`Zones seeded: ${total} zones created`);
  console.log('  Hierarchy: 3 Divisions → 8 Districts → 18 Thanas → 5 Areas');
}

main()
  .catch(e => { console.error('Zone seeding failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
