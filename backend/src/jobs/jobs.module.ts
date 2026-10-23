import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobStateMachineService } from './job-state-machine.service';
import { PricingModule } from '../pricing/pricing.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PricingModule, AuthModule, NotificationsModule, AuditModule],
  controllers: [JobsController],
  providers: [JobsService, JobStateMachineService],
  exports: [JobsService, JobStateMachineService],
})
export class JobsModule {}
