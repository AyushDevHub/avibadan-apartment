-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "paidByFlatId" TEXT;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidByFlatId_fkey" FOREIGN KEY ("paidByFlatId") REFERENCES "Flat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
