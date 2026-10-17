import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('disputes')
@Controller('disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'List open delivery disputes' })
  async getDisputes() {
    return { data: await this.disputesService.listDisputes() };
  }

  @Post(':id/resolve')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Resolve an active dispute' })
  async resolveDispute(
    @Param('id') id: string,
    @Body('resolution') resolution: any,
    @Body('note') note?: string,
  ) {
    return { data: await this.disputesService.resolveDispute(id, resolution, note) };
  }
}
