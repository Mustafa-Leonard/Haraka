import { Module, Global } from '@nestjs/common';
import { LoggerService } from './services/logger.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

@Global()
@Module({
  providers: [LoggerService, GlobalExceptionFilter],
  exports: [LoggerService, GlobalExceptionFilter],
})
export class CommonModule {}
