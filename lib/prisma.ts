import { PrismaClient } from "@/lib/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_gMcU8biJrE1l@ep-rough-night-bazkh3dn-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require";

  const adapter = new PrismaPg({ connectionString }, { schema: "choco" });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
