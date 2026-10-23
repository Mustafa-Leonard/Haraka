import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '@haraka/shared-types';
import { offerResponseSchema, type OfferResponseDto } from '@haraka/validation';
import { ZodBody } from '../common/decorators/zod-body.decorator';

@ApiTags('dispatch')
@Controller('rider')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get('offers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current pending job offers for rider' })
  async getOffers(@CurrentUser() user: AuthUser) {
    const offers = await this.dispatchService.getRiderOffers(user.id);
    return { data: offers };
  }

  @Post('offers/:id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Accept incoming delivery offer' })
  async acceptOffer(
    @CurrentUser() user: AuthUser,
    @Param('id') offerId: string,
  ) {
    const res = await this.dispatchService.acceptOffer(offerId, user.id);
    return { data: res };
  }

  @Post('offers/:id/decline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Decline incoming delivery offer' })
  async declineOffer(
    @CurrentUser() user: AuthUser,
    @Param('id') offerId: string,
    @ZodBody(offerResponseSchema) body?: OfferResponseDto,
  ) {
    const res = await this.dispatchService.declineOffer(offerId, user.id, body?.declineReason);
    return { data: res };
  }
}
