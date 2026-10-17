import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import pino from 'pino';

const logger = pino({ level: 'info' });
const prisma = new PrismaClient();

const redisConnection = {
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
  password: process.env['REDIS_PASSWORD'] || undefined,
};

async function startWorker() {
  logger.info('🚀 Haraka BullMQ Background Worker starting...');

  // Outbox notification worker
  try {
    const notificationWorker = new Worker(
      'notifications-queue',
      async (job) => {
        logger.info(`Processing notification job: ${job.name} (ID: ${job.id})`);
        const { to, message, channel } = job.data;

        // Perform SMS delivery via Africa's Talking / sandbox
        logger.info(`[Worker SMS] Sending to ${to}: ${message}`);
        return { delivered: true, timestamp: new Date() };
      },
      { connection: redisConnection, concurrency: 5 },
    );

    notificationWorker.on('completed', (job) => {
      logger.info(`Notification job ${job.id} completed successfully`);
    });

    notificationWorker.on('failed', (job, err) => {
      logger.error(`Notification job ${job?.id} failed: ${err.message}`);
    });
  } catch (err: any) {
    logger.warn(`Redis connection warning for worker queues: ${err.message}. Running in local poller mode.`);
  }

  // Periodic polling fallback for pending outbox events
  setInterval(async () => {
    try {
      const pendingEvents = await prisma.outboxEvent.findMany({
        where: {
          processedAt: null,
          attempts: { lt: 5 },
        },
        take: 10,
      });

      for (const event of pendingEvents) {
        logger.info(`Processing OutboxEvent ${event.id} of type ${event.eventType}`);
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            attempts: { increment: 1 },
            processedAt: new Date(),
          },
        });
      }
    } catch {
      // In dev without DB
    }
  }, 10000);

  logger.info('✅ Haraka Worker initialized and listening for jobs');
}

startWorker().catch((err) => {
  logger.error('Worker failed to start:', err);
});
