-- AlterTable
ALTER TABLE "Flat" ADD COLUMN     "isCollector" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MemberLedgerEntry" (
    "id" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "expenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MemberLedgerEntry" ADD CONSTRAINT "MemberLedgerEntry_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
