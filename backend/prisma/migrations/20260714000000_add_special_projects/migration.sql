-- Add area (sq.ft) to Flat, used to split special project funds proportionally
ALTER TABLE "Flat" ADD COLUMN "areaSqFt" DOUBLE PRECISION;

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('COLLECTING', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');

-- CreateTable
CREATE TABLE "SpecialProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'COLLECTING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "closingNote" TEXT,
    CONSTRAINT "SpecialProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectShare" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "areaSqFt" DOUBLE PRECISION NOT NULL,
    "dueAmount" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "ProjectShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPayment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "receiptNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectExpense" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "billUpload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectShare_projectId_flatId_key" ON "ProjectShare" ("projectId", "flatId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPayment_receiptNo_key" ON "ProjectPayment" ("receiptNo");

-- AddForeignKey
ALTER TABLE "ProjectShare"
ADD CONSTRAINT "ProjectShare_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SpecialProject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectShare"
ADD CONSTRAINT "ProjectShare_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPayment"
ADD CONSTRAINT "ProjectPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SpecialProject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectPayment"
ADD CONSTRAINT "ProjectPayment_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectExpense"
ADD CONSTRAINT "ProjectExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "SpecialProject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;