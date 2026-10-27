import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_gMcU8biJrE1l@ep-rough-night-bazkh3dn-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require&schema=choco",
  },
});
