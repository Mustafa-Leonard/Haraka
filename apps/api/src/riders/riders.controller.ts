import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RidersService } from './riders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '@haraka/shared-types';
import { riderAvailabilitySchema, type RiderAvailabilityDto } from '@haraka/validation';
import { ZodBody } from '../common/decorators/zod-body.decorator';

@ApiTags('rider')
@Controller('rider')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current rider profile' })
  async getProfile(@CurrentUser() user: AuthUser) {
    const profile = await this.ridersService.getProfile(user.id);
    return { data: profile };
  }

  @Post('availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Toggle rider online/offline status' })
  async setAvailability(
    @CurrentUser() user: AuthUser,
    @ZodBody(riderAvailabilitySchema) body: RiderAvailabilityDto,
  ) {
    const result = await this.ridersService.setAvailability(user.id, body.online);
    return { data: result };
  }

  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get rider earnings and trip breakdown' })
  async getEarnings(@CurrentUser() user: AuthUser) {
    const earnings = await this.ridersService.getEarnings(user.id);
    return { data: earnings };
  }
}
