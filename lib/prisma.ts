import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    // Prisma 7.x client engine requires accelerateUrl
    // For local development with SQLite, we use a mock URL
    // The actual database connection uses DATABASE_URL from .env
    accelerateUrl: process.env.ACCELERATE_URL || "prisma://localhost?api_key=local-dev-mock",
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
