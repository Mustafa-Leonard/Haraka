import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggerService } from './common/services/logger.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create NestJS app with Fastify adapter
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false, // we use Pino directly
      trustProxy: true,
      bodyLimit: 10 * 1024 * 1024, // 10 MB
    }),
    { bufferLogs: true },
  );

  const configService = app.get(ConfigService);
  const appLogger = app.get(LoggerService);
  app.useLogger(appLogger);

  // Register Fastify plugins
  await app.register(fastifyCookie as any, {
    secret: configService.getOrThrow<string>('COOKIE_SECRET'),
  });

  await app.register(fastifyHelmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'ws:'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  // CORS
  const corsOrigins = configService
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Request-ID'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global exception filter
  app.useGlobalFilters(app.get(GlobalExceptionFilter));

  // Global validation pipe using Zod
  app.useGlobalPipes(new ZodValidationPipe());

  // Request size limit
  app.use(RequestIdMiddleware);

  // OpenAPI documentation
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  if (nodeEnv !== 'production') {
    const docBuilder = new DocumentBuilder()
      .setTitle('Haraka API')
      .setDescription(
        'Haraka on-demand delivery platform REST API. All monetary amounts are in KES minor units (1 KES = 100 units).',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addServer('http://localhost:3000', 'Local development')
      .addTag('auth', 'Authentication and session management')
      .addTag('merchant', 'Merchant delivery management')
      .addTag('rider', 'Rider operations')
      .addTag('public', 'Public tracking (unauthenticated)')
      .addTag('dispatcher', 'Dispatcher operations')
      .addTag('admin', 'Administration')
      .addTag('health', 'Health and readiness checks')
      .build();

    const document = SwaggerModule.createDocument(app, docBuilder);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    });
  }

  // Start server
  const port = configService.get<number>('API_PORT', 3000);
  const host = configService.get<string>('API_HOST', '0.0.0.0');

  await app.listen(port, host);
  logger.log(`Haraka API running at http://${host}:${port}`);
  logger.log(`API docs: http://${host}:${port}/api/docs`);
  logger.log(`Readiness: http://${host}:${port}/api/v1/health/ready`);

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, initiating graceful shutdown...`);
      await app.close();
      logger.log('Application closed.');
      process.exit(0);
    });
  }
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
