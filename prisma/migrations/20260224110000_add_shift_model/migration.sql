-- Migration: add_shift_model
-- Description: Add Shift model for cashier shift management

-- Create Shift table
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "startingCash" DOUBLE PRECISION NOT NULL,
    "endingCash" DOUBLE PRECISION,
    "expectedCash" DOUBLE PRECISION,
    "discrepancy" DOUBLE PRECISION,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- Add shiftId column to Order table
ALTER TABLE "Order" ADD COLUMN "shiftId" TEXT;

-- Create foreign key for Shift.userId -> User.id
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create foreign key for Order.shiftId -> Shift.id
ALTER TABLE "Order" ADD CONSTRAINT "Order_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for better query performance
CREATE INDEX "Shift_userId_idx" ON "Shift"("userId");
CREATE INDEX "Shift_status_idx" ON "Shift"("status");
CREATE INDEX "Order_shiftId_idx" ON "Order"("shiftId");
