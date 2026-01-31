import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error", "warn"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    transactionOptions: {
      timeout: 20000, // 20 seconds
      maxWait: 5000,  // 5 seconds
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
