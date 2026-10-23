import { Worker, type Job } from 'bullmq';
import axios from 'axios';
import pino from 'pino';
import { z } from 'zod';

const logger = pino({ level: process.env['LOG_LEVEL'] ?? 'info' });
const notificationJobSchema = z.object({
  to: z.string().min(1),
  message: z.string().min(1),
  channel: z.literal('SMS'),
});
type NotificationJob = z.infer<typeof notificationJobSchema>;

function redisConnection() {
  const url = new URL(process.env['REDIS_URL'] ?? 'redis://localhost:6379');
  const db = Number(url.pathname.slice(1) || 0);

  return {
    host: url.hostname,
    port: Number(url.port || (url.protocol === 'rediss:' ? 6380 : 6379)),
    username: url.username || undefined,
    password: url.password || undefined,
    db,
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

async function sendSms(to: string, message: string) {
  if (process.env['AT_ENV'] === 'sandbox') {
    logger.info('SMS sandbox job processed.');
    return { isSandbox: true };
  }

  const apiKey = process.env['AT_API_KEY'];
  const username = process.env['AT_USERNAME'];
  if (process.env['AT_ENV'] !== 'production' || !apiKey || !username) {
    throw new Error('Live SMS integration is not fully configured.');
  }

  const params = new URLSearchParams({
    username,
    to,
    message,
  });
  if (process.env['AT_SENDER_ID']) {
    params.set('from', process.env['AT_SENDER_ID']);
  }

  let response;
  try {
    response = await axios.post(
      'https://api.africastalking.com/version1/messaging',
      params.toString(),
      {
        headers: {
          apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        timeout: 10_000,
      },
    );
  } catch {
    throw new Error('SMS provider request failed.');
  }

  const recipient = response.data?.SMSMessageData?.Recipients?.[0];
  if (recipient?.status !== 'Success') {
    throw new Error('SMS provider did not confirm delivery.');
  }
  return { isSandbox: false, messageId: recipient.messageId };
}

async function processNotification(job: Job<NotificationJob>) {
  const parsed = notificationJobSchema.safeParse(job.data);
  if (!parsed.success) {
    throw new Error('Invalid SMS notification job payload.');
  }
  return sendSms(parsed.data.to, parsed.data.message);
}

const worker = new Worker('notifications-queue', processNotification, {
  connection: redisConnection(),
  concurrency: Number(process.env['WORKER_CONCURRENCY'] ?? 5),
});

worker.on('ready', () => logger.info('Notification worker is ready.'));
worker.on('failed', () => logger.error('Notification job failed.'));
worker.on('error', () => logger.error('Notification worker encountered an error.'));

const shutdown = async () => {
  await worker.close();
  logger.info('Notification worker stopped.');
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
