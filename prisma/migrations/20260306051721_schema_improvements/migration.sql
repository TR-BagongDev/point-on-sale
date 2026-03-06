/*
  Warnings:

  - You are about to alter the column `price` on the `Menu` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `subtotal` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `tax` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `discount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `total` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - The `paymentMethod` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `variantId` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `variantName` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `OrderItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - The `status` column on the `Shift` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `startingCash` on the `Shift` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `endingCash` on the `Shift` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `expectedCash` on the `Shift` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `discrepancy` on the `Shift` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `modifications` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `MenuVariant` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'KASIR');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'QRIS', 'TRANSFER');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- DropForeignKey
ALTER TABLE "MenuVariant" DROP CONSTRAINT "MenuVariant_menuId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_variantId_fkey";

-- DropForeignKey
ALTER TABLE "OrderModification" DROP CONSTRAINT "OrderModification_userId_fkey";

-- DropIndex
DROP INDEX "Order_shiftId_idx";

-- DropIndex
DROP INDEX "OrderModification_orderId_idx";

-- DropIndex
DROP INDEX "OrderModification_userId_idx";

-- DropIndex
DROP INDEX "Shift_status_idx";

-- DropIndex
DROP INDEX "Shift_userId_idx";

-- AlterTable
ALTER TABLE "Menu" ALTER COLUMN "price" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "syncedAt" TIMESTAMP(3),
ALTER COLUMN "subtotal" SET DATA TYPE INTEGER,
ALTER COLUMN "tax" SET DEFAULT 0,
ALTER COLUMN "tax" SET DATA TYPE INTEGER,
ALTER COLUMN "discount" SET DEFAULT 0,
ALTER COLUMN "discount" SET DATA TYPE INTEGER,
ALTER COLUMN "total" SET DATA TYPE INTEGER,
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "variantId",
DROP COLUMN "variantName",
ALTER COLUMN "price" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Shift" DROP COLUMN "status",
ADD COLUMN     "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
ALTER COLUMN "startingCash" SET DATA TYPE INTEGER,
ALTER COLUMN "endingCash" SET DATA TYPE INTEGER,
ALTER COLUMN "expectedCash" SET DATA TYPE INTEGER,
ALTER COLUMN "discrepancy" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "modifications",
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'KASIR';

-- DropTable
DROP TABLE "MenuVariant";

-- AddForeignKey
ALTER TABLE "OrderModification" ADD CONSTRAINT "OrderModification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
