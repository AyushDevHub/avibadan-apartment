const prisma = require("../config/prisma");

// Wipes ALL financial transaction data - payments, bills, expenses, salary
// payments, the cash ledger, the bank ledger - so you can start fresh.
//
// Deliberately does NOT touch: Flats, Users (logins), Staff records,
// Notices, Complaints. Those are your structural setup, not transaction
// history, and re-creating logins for everyone is the last thing you want
// after a reset.
//
// Requires the exact confirmation phrase in the request body so this can
// never be triggered by accident.
async function resetTransactions(req, res) {
  const { confirm } = req.body;
  if (confirm !== "RESET ALL TRANSACTIONS") {
    return res.status(400).json({
      message: "Type the exact confirmation phrase: RESET ALL TRANSACTIONS",
    });
  }

  // Order matters - delete children before parents to satisfy foreign keys.
  await prisma.payment.deleteMany();
  await prisma.maintenanceBill.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.salaryPayment.deleteMany();
  await prisma.cashTransaction.deleteMany();
  await prisma.bankTransaction.deleteMany();

  res.json({
    message:
      "All transactions reset. Flats, logins, and staff records were kept.",
  });
}

module.exports = { resetTransactions };
