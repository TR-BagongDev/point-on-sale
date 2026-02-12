-- Migration: add_order_modification
-- Description: Add OrderModification model for tracking change history and update Order status enum

-- Create OrderModification table
CREATE TABLE "OrderModification" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "changes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderModification_pkey" PRIMARY KEY ("id")
);

-- Create indexes for OrderModification
CREATE INDEX "OrderModification_orderId_idx" ON "OrderModification"("orderId");
CREATE INDEX "OrderModification_userId_idx" ON "OrderModification"("userId");

-- Add foreign key constraints
ALTER TABLE "OrderModification" ADD CONSTRAINT "OrderModification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderModification" ADD CONSTRAINT "OrderModification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update User model to reference OrderModification
ALTER TABLE "User" ADD COLUMN "modifications" TEXT[];

-- Note: The Order status enum is already updated in the schema to include PREPARING and READY
-- The database constraint check will be handled at the application level
