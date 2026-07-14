// One-time (or repeatable) utility to set/fix each flat's Area (sq.ft).
//
// SAFE: this script only UPDATES the areaSqFt field on existing Flat rows.
// It never deletes or touches bills, payments, expenses, cashbook, special
// projects, or logins. Run it as many times as you like — it just
// overwrites areaSqFt with the values below and leaves everything else
// exactly as it was.
//
// Matching is by ownerName (case/space-insensitive). If a name below
// doesn't match any flat in your database, it's skipped and printed so you
// can fix the spelling and re-run.
//
// Usage:
//   cd backend
//   node prisma/set-areas.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Edit this list if areas ever need correcting — re-run the script any time.
const AREAS = [
  { owner: "Ashok Kumar Das", areaSqFt: 914 },
  { owner: "Pushparghya Ghosh", areaSqFt: 476 },
  { owner: "Pradyut Ghosh", areaSqFt: 710 },
  { owner: "Ukil Shaw", areaSqFt: 476 },
  { owner: "Aniruddha Mukherjee", areaSqFt: 1626 },
  { owner: "Samapti Das", areaSqFt: 476 },
  { owner: "Abhijit Bhattacharya", areaSqFt: 914 },
  { owner: "Sumona Nath", areaSqFt: 710 },
];

const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

async function main() {
  const flats = await prisma.flat.findMany();

  let updated = 0;
  let totalSet = 0;
  const unmatched = [];

  for (const entry of AREAS) {
    const match = flats.find((f) => norm(f.ownerName) === norm(entry.owner));
    if (!match) {
      unmatched.push(entry.owner);
      continue;
    }
    await prisma.flat.update({
      where: { id: match.id },
      data: { areaSqFt: entry.areaSqFt },
    });
    console.log(
      `✓ ${match.flatNumber.padEnd(8)} ${match.ownerName.padEnd(24)} → ${
        entry.areaSqFt
      } sq.ft`
    );
    updated++;
    totalSet += entry.areaSqFt;
  }

  console.log("");
  console.log(`Updated ${updated} flat(s). Total area set: ${totalSet} sq.ft`);

  if (unmatched.length) {
    console.log("");
    console.log(
      "⚠ No matching flat found for (check spelling in your DB vs this script):"
    );
    unmatched.forEach((n) => console.log(`  - ${n}`));
  }

  const stillMissing = flats.filter(
    (f) => !AREAS.some((e) => norm(e.owner) === norm(f.ownerName))
  );
  if (stillMissing.length) {
    console.log("");
    console.log(
      "ℹ These flats were NOT in the list above and were left untouched:"
    );
    stillMissing.forEach((f) =>
      console.log(
        `  - ${f.flatNumber} (${f.ownerName}) — current areaSqFt: ${
          f.areaSqFt ?? "not set"
        }`
      )
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
