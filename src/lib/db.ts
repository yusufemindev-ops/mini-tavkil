import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@/generated/prisma/client';

// Prisma 7 is Rust-free and runs on Cloudflare Workers via a driver adapter.
//
// DATABASE_URL must be the POOLED (-pooler) Neon URL, which uses HTTP. HTTP lets
// Neon compute autosuspend between requests, which is what keeps the free tier's
// 100 CU-hours viable. WebSocket mode holds the compute awake and burns them.
//
// Consequence: no interactive transactions on request paths.
//   OK    prisma.$transaction([a, b])
//   NOT   prisma.$transaction(async (tx) => …)   <- use a script with DIRECT_URL
//
// See .claude/skills/cloudflare-constraints.md
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

// Workers create a fresh isolate per request, so this cache is a no-op there.
// It exists to stop `next dev` from opening a new client on every hot reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
