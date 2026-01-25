/*
  Warnings:

  - You are about to drop the column `accountId` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `budgetId` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `customIntervalDays` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedAmount` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `isArchived` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `lastPaymentDate` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `recipient` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `recurrenceType` on the `Bill` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Bill` table. All the data in the column will be lost.
  - Added the required column `amount` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dueDate` to the `Bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recurringBillId` to the `Bill` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_accountId_fkey";

-- DropForeignKey
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_categoryId_fkey";

-- DropIndex
DROP INDEX "Bill_accountId_idx";

-- DropIndex
DROP INDEX "Bill_budgetId_idx";

-- DropIndex
DROP INDEX "Bill_categoryId_idx";

-- DropIndex
DROP INDEX "Bill_isArchived_idx";

-- DropIndex
DROP INDEX "Bill_startDate_idx";

-- AlterTable
ALTER TABLE "Bill" DROP COLUMN "accountId",
DROP COLUMN "budgetId",
DROP COLUMN "categoryId",
DROP COLUMN "createdAt",
DROP COLUMN "customIntervalDays",
DROP COLUMN "estimatedAmount",
DROP COLUMN "isArchived",
DROP COLUMN "lastPaymentDate",
DROP COLUMN "name",
DROP COLUMN "recipient",
DROP COLUMN "recurrenceType",
DROP COLUMN "startDate",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "dueDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "recurringBillId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "RecurringBill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "recurrenceType" "RecurrenceType" NOT NULL DEFAULT 'NONE',
    "customIntervalDays" INTEGER,
    "estimatedAmount" DOUBLE PRECISION NOT NULL,
    "lastPaymentDate" TIMESTAMP(3),
    "categoryId" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringBill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringBill_budgetId_idx" ON "RecurringBill"("budgetId");

-- CreateIndex
CREATE INDEX "RecurringBill_accountId_idx" ON "RecurringBill"("accountId");

-- CreateIndex
CREATE INDEX "RecurringBill_categoryId_idx" ON "RecurringBill"("categoryId");

-- CreateIndex
CREATE INDEX "RecurringBill_isArchived_idx" ON "RecurringBill"("isArchived");

-- CreateIndex
CREATE INDEX "Bill_recurringBillId_idx" ON "Bill"("recurringBillId");

-- CreateIndex
CREATE INDEX "Bill_dueDate_idx" ON "Bill"("dueDate");

-- AddForeignKey
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_recurringBillId_fkey" FOREIGN KEY ("recurringBillId") REFERENCES "RecurringBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
