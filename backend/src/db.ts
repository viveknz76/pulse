import { PrismaClient } from "@prisma/client";

// Reuse a single Prisma client instance (important with tsx watch / hot reload).
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
