import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SmsAdapter } from './sms.adapter';

@Global()
@Module({
  providers: [NotificationsService, SmsAdapter],
  exports: [NotificationsService, SmsAdapter],
})
export class NotificationsModule {}
