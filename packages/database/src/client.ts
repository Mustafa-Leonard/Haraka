import { PrismaClient } from './generated/client';

export * from './generated/client';

let prisma: PrismaClient;

if (process.env['NODE_ENV'] === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, avoid exhausting connection pool with fast-reload
  const globalWithPrisma = global as typeof globalThis & {
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
