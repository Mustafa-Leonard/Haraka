import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser, MpesaCallbackDto } from '@haraka/shared-types';
import { initiateMpesaSchema, type InitiateMpesaDto } from '@haraka/validation';
import { ZodBody } from '../common/decorators/zod-body.decorator';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('merchant/payments/mpesa')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Initiate Lipa Na M-Pesa STK push for a delivery job' })
  async initiateMpesa(
    @CurrentUser() user: AuthUser,
    @ZodBody(initiateMpesaSchema) body: InitiateMpesaDto,
  ) {
    const payment = await this.paymentsService.initiateMpesaPayment(user.id, body);
    return { data: payment };
  }

  @Get('merchant/payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get merchant transaction history' })
  async getMerchantPayments(@CurrentUser() user: AuthUser) {
    const payments = await this.paymentsService.getMerchantPayments(user.id);
    return { data: payments };
  }

  @Post('payments/mpesa/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Public M-Pesa STK push callback receiver' })
  async handleMpesaCallback(@Body() body: MpesaCallbackDto) {
    await this.paymentsService.handleMpesaCallback(body);
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  }
}
