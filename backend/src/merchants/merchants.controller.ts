import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '@haraka/shared-types';
import {
  updateMerchantProfileSchema,
  createAddressSchema,
  type UpdateMerchantProfileDto,
  type CreateAddressDto,
} from '@haraka/validation';
import { ZodBody } from '../common/decorators/zod-body.decorator';

@ApiTags('merchant')
@Controller('merchant')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get merchant profile' })
  async getProfile(@CurrentUser() user: AuthUser) {
    const profile = await this.merchantsService.getProfile(user.id);
    return { data: profile };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update merchant profile' })
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @ZodBody(updateMerchantProfileSchema) body: UpdateMerchantProfileDto,
  ) {
    const profile = await this.merchantsService.updateProfile(user.id, body);
    return { data: profile };
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get merchant dashboard metrics' })
  async getDashboard(@CurrentUser() user: AuthUser) {
    const stats = await this.merchantsService.getDashboard(user.id);
    return { data: stats };
  }

  @Get('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List saved addresses' })
  async getAddresses(@CurrentUser() user: AuthUser) {
    const addresses = await this.merchantsService.getAddresses(user.id);
    return { data: addresses };
  }

  @Post('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create new saved address' })
  async createAddress(
    @CurrentUser() user: AuthUser,
    @ZodBody(createAddressSchema) body: CreateAddressDto,
  ) {
    const address = await this.merchantsService.createAddress(user.id, body as any);
    return { data: address };
  }
}
