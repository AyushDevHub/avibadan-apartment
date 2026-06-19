# AVIBADAN APARTMENT — Maintenance Management System

Personal society maintenance system for AVIBADAN APARTMENT, 361/A G.T. Road (S),
Bataitala Bazar, Howrah. Blank slate, starting January 2026 — no fake or
historical data. You enter the opening balance and every transaction by hand
through the admin panel, same as a paper register, just digital.

## Stack

- **Frontend**: React + Vite, React Router, TanStack Query, vanilla CSS (no Tailwind), Recharts, lucide-react
- **Backend**: Node.js + Express, Prisma ORM, JWT auth, bcrypt, PDFKit (receipts)
- **Database**: PostgreSQL (use [Neon](https://neon.tech) for a free hosted instance)

## Login system

Everyone logs in with a **username and password** — no email required. Each
flat can have its own personal login created by the admin.

- **Admin**: full access to bills, payments, expenses, staff, cashbook, reports.
- **Resident**: their own flat's dues, bills, payment history + receipts, plus
  the society's overall cash-in-hand and bank balance (this is a personal/family
  building, so funds are shown openly to everyone, not hidden).

## Setup

### 1. Database
Create a free Postgres DB on [Neon](https://neon.tech). Use the **non-pooled**
connection string for migrations.

### 2. Backend
```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL, JWT_SECRET (generate with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# )
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

**Before running `npm run seed`**, open `backend/prisma/seed.js` and check the
`FLATS` array — it has your 9 real flats/owners with placeholder usernames and
passwords. Change the passwords to whatever you want each resident to actually
use. The seed creates **no financial data** — just the admin login, the flats,
and one personal login per flat.

After seeding, the console prints every username/password — write them down or
hand them out to each flat owner.

### 3. Frontend
```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

## Your first day as admin

1. Log in as `admin`.
2. **Cashbook → Manual Entry** — add your January 2026 opening balance (cash in
   hand right now, today). If you also keep money in a bank account, add that
   opening figure under **Bank Ledger → Add Entry**.
3. **Maintenance Bills → Generate** — pick `2026-01`, set a due date, generates
   a bill for all 9 flats using their rates.
4. **Payments → Receive Payment** — as people pay, record it here. This
   auto-generates a PDF receipt (shareable link, no login needed to view it)
   and updates the cashbook automatically.
5. **Expenses → Add Expense** — every rupee spent (electricity, cleaner's wage,
   repairs) — also updates the cashbook automatically.
6. Repeat steps 3–5 every month going forward.
7. On each resident's page (**Residents → [flat] → Create Login**), set up
   their personal username/password if you haven't already, so they can check
   their own dues anytime.

## Adding/removing flats or residents

- **Residents page**: add, edit, or remove flats (owner name, monthly rate).
- **Resident detail page**: create a login for that flat's owner.

## Pages

- **Public**: Home (fund status + announcements), Login, Transparency (public, live data)
- **Admin**: Dashboard, Residents, Maintenance Bills, Payments, Dues, Expenses,
  Staff, Cashbook, Bank Ledger, Notice Board, Complaints, Reports (CSV export)
- **Resident**: My Dues (own bills/payments/receipts + society cash/bank
  balance), Notice Board, Complaints

## Not included (the spec's "Premium / Later" list)

WhatsApp reminders, automatic late fees, QR payments, visitor/parking
management, document repository, AGM voting. Expense bill uploads are a plain
URL/link field — wire up Cloudinary later if you want real file uploads.

## Deploying

Same pattern as your stock-sim project: backend → Render, frontend → Vercel.
Set `VITE_API_URL` on Vercel to your deployed Render API URL, and `FRONTEND_URL`
on Render to your deployed Vercel URL (for CORS).
