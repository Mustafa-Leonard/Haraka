import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser, QuoteResponseDto } from '@haraka/shared-types';
import { quoteRequestSchema, type QuoteRequestDto } from '@haraka/validation';
import { ZodBody } from '../common/decorators/zod-body.decorator';

@ApiTags('pricing')
@Controller()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('merchant/jobs/quote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtain locked 5-minute price quote for delivery' })
  async getQuote(
    @CurrentUser() user: AuthUser,
    @ZodBody(quoteRequestSchema) body: QuoteRequestDto,
  ): Promise<{ data: QuoteResponseDto }> {
    const quote = await this.pricingService.generateQuote(user.id, body as any);
    return { data: quote };
  }
}
