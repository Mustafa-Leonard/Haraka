import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { RoutingService } from './routing.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PricingController],
  providers: [PricingService, RoutingService],
  exports: [PricingService, RoutingService],
})
export class PricingModule {}
