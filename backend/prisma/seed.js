// This seed creates ONLY the structural data: an admin login, the 9 real flats
// from your building, and one personal login per flat owner.
//
// It does NOT create any bills, payments, expenses, or cash/bank transactions.
// You enter the January 2026 opening balance yourself (Cashbook -> Manual Entry),
// then generate bills and record payments each month going forward through the
// admin panel — exactly like you'd write it by hand in a register, just digital.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Edit this list to match your actual flats/owners before running the seed.
// `username` is what they type to log in - keep it short, lowercase, no spaces.
const FLATS = [
  { num: 'Flat-1', owner: 'Pradyut Kumar Ghosh',     rate: 355, username: 'pradyut',   password: 'flat1pass' },
  { num: 'Flat-2', owner: 'Ashoke Kumar Das',        rate: 457, username: 'ashoke',    password: 'flat2pass' },
  { num: 'Flat-3', owner: 'Pushparghya Ghosh',       rate: 238, username: 'pushparghya', password: 'flat3pass' },
  { num: 'Flat-4', owner: 'Aniruddha Mukherjee',     rate: 813, username: 'aniruddha', password: 'flat4pass' },
  { num: 'Flat-5', owner: 'Ukil Shaw',               rate: 237, username: 'ukil',      password: 'flat5pass' },
  { num: 'Flat-6', owner: 'Sumana Nath',             rate: 355, username: 'sumana',    password: 'flat6pass' },
  { num: 'Flat-7', owner: 'Abhijit Bhattacherjee',   rate: 457, username: 'abhijit',   password: 'flat7pass' },
  { num: 'Flat-8', owner: 'Samapti Das',             rate: 237, username: 'samapti',   password: 'flat8pass' },
  { num: 'Shop-1', owner: 'Mitali Sweets',           rate: 250, username: 'mitali',    password: 'shop1pass' },
];

async function clearDatabase() {
  await prisma.payment.deleteMany();
  await prisma.maintenanceBill.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.salaryPayment.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.cashTransaction.deleteMany();
  await prisma.bankTransaction.deleteMany();
  await prisma.notice.deleteMany();
  await prisma.user.deleteMany();
  await prisma.flat.deleteMany();
  await prisma.setting.deleteMany();
}

async function main() {
  await clearDatabase();

  // Admin login
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: { name: 'Society Admin', username: 'admin', passwordHash: adminHash, role: 'ADMIN' },
  });

  // Flats + one personal login per flat
  for (const f of FLATS) {
    const flat = await prisma.flat.create({
      data: { flatNumber: f.num, ownerName: f.owner, monthlyRate: f.rate, status: 'ACTIVE' },
    });
    const hash = await bcrypt.hash(f.password, 10);
    await prisma.user.create({
      data: {
        name: f.owner,
        username: f.username,
        passwordHash: hash,
        role: 'RESIDENT',
        flatId: flat.id,
      },
    });
  }

  console.log('Seed complete - no financial data created.');
  console.log('');
  console.log('Admin login:    username "admin"     / password "admin123"');
  console.log('');
  console.log('Resident logins:');
  for (const f of FLATS) {
    console.log(`  ${f.num.padEnd(8)} ${f.owner.padEnd(24)} username "${f.username.padEnd(12)}" / password "${f.password}"`);
  }
  console.log('');
  console.log('Next: log in as admin -> Cashbook -> Manual Entry -> add your');
  console.log('January 2026 opening balance. Then Maintenance Bills -> Generate,');
  console.log('and Payments -> Receive Payment, each month going forward.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
