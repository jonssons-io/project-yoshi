/*
  Warnings:

  - You are about to drop the column `type` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `budgetId` on the `Income` table. All the data in the column will be lost.
  - Added the required column `householdId` to the `Income` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Income" DROP CONSTRAINT "Income_budgetId_fkey";

-- DropIndex
DROP INDEX "Category_type_idx";

-- DropIndex
DROP INDEX "Income_budgetId_idx";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "type",
ADD COLUMN     "types" "CategoryType"[];

-- AlterTable
ALTER TABLE "Income" DROP COLUMN "budgetId",
ADD COLUMN     "householdId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "budgetId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Income_householdId_idx" ON "Income"("householdId");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
