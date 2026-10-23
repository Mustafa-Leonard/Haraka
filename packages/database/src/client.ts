import { PrismaClient } from './generated/client';

export * from './generated/client';

declare const process: { env: Record<string, string | undefined> };
declare const global: any;

let prisma: PrismaClient;

if (typeof process !== 'undefined' && process.env?.['NODE_ENV'] === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, avoid exhausting connection pool with fast-reload
  const globalWithPrisma = (typeof global !== 'undefined' ? global : globalThis) as typeof globalThis & {
    prisma?: PrismaClient;
  };
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  prisma = globalWithPrisma.prisma;
}

export { prisma };
export default prisma;
