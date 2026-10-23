import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { DarajaAdapter } from './daraja.adapter';
import { AuthModule } from '../auth/auth.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [AuthModule, LedgerModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, DarajaAdapter],
  exports: [PaymentsService, DarajaAdapter],
})
export class PaymentsModule {}
