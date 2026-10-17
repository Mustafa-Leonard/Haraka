import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MerchantsModule } from './merchants/merchants.module';
import { RidersModule } from './riders/riders.module';
import { JobsModule } from './jobs/jobs.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { TrackingModule } from './tracking/tracking.module';
import { PricingModule } from './pricing/pricing.module';
import { PaymentsModule } from './payments/payments.module';
import { LedgerModule } from './ledger/ledger.module';
import { PayoutsModule } from './payouts/payouts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DisputesModule } from './disputes/disputes.module';
import { RatingsModule } from './ratings/ratings.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { PrivacyModule } from './privacy/privacy.module';
import { HealthModule } from './health/health.module';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { validateConfig } from './common/config/config.validator';

@Module({
  imports: [
    // Configuration — validates required env vars on startup
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
      expandVariables: true,
    }),

    // Throttler — global rate limiting via Redis
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('RATE_LIMIT_API_WINDOW_MS', 60000),
            limit: config.get<number>('RATE_LIMIT_API_MAX', 200),
          },
        ],
      }),
    }),

    // Cron scheduling
    ScheduleModule.forRoot(),

    // Application events (internal)
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
    }),

    // Infrastructure
    DatabaseModule,
    RedisModule,
    CommonModule,

    // Business modules (alphabetical within each group)
    AuditModule,
    AuthModule,
    UsersModule,
    MerchantsModule,
    RidersModule,
    JobsModule,
    DispatchModule,
    TrackingModule,
    PricingModule,
    PaymentsModule,
    LedgerModule,
    PayoutsModule,
    NotificationsModule,
    DisputesModule,
    RatingsModule,
    ReportsModule,
    AdminModule,
    PrivacyModule,

    // Infrastructure modules
    HealthModule,
  ],
})
export class AppModule {}
