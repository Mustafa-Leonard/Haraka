import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { RoutingService } from './routing.service';
import type {
  QuoteRequestDto,
  QuoteResponseDto,
  VehicleType,
  ParcelSize,
} from '@haraka/shared-types';
import { PARCEL_SIZE_MULTIPLIERS, SLA } from '@haraka/config';
import { minimumWholeKesFare, roundFareToWholeKes } from './fare-rounding';

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routing: RoutingService,
  ) {}

  async generateQuote(merchantId: string, params: QuoteRequestDto): Promise<QuoteResponseDto> {
    const zone = await this.prisma.serviceZone.findFirst({
      where: { slug: params.zoneSlug, isActive: true },
      select: { id: true, name: true },
    });
    if (!zone) {
      throw new NotFoundException('Selected service zone is unavailable.');
    }

    const route = await this.routing.calculateRoute(
      params.pickupLat,
      params.pickupLng,
      params.dropoffLat,
      params.dropoffLng,
    );

    const distanceKm = Math.max(0.5, route.distanceMeters / 1000);

    const dbRule = await this.prisma.pricingRule.findFirst({
      where: {
        zoneId: zone.id,
        vehicleType: params.vehicleType,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });
    if (!dbRule) {
      throw new ServiceUnavailableException(
        `No active pricing rule is configured for ${params.vehicleType}.`,
      );
    }
    if (dbRule.riderShareBps === null) {
      throw new ServiceUnavailableException(
        `Rider compensation is not configured for ${params.vehicleType} in ${zone.name}.`,
      );
    }

    const zoneOverride = await this.prisma.zonePricingOverride.findFirst({
      where: { zoneId: zone.id, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { surcharge: true },
    });
    const surcharge = zoneOverride?.surcharge ?? 0;
    if (!Number.isSafeInteger(surcharge) || surcharge < 0) {
      throw new ServiceUnavailableException(
        `The configured surcharge for ${zone.name} is invalid.`,
      );
    }

    const { baseFare, perKmRate, minimumFare } = dbRule;

    const parcelMultiplier = PARCEL_SIZE_MULTIPLIERS[params.parcelSize] ?? 1.0;
    const distanceFare = Math.round(distanceKm * perKmRate);
    const subtotal = Math.round((baseFare + distanceFare) * parcelMultiplier);
    const unroundedTotal = Math.max(subtotal, minimumFare) + surcharge;
    const totalAmount = Math.max(
      roundFareToWholeKes(unroundedTotal),
      minimumWholeKesFare(minimumFare + surcharge),
    );

    const expiresAt = new Date(Date.now() + SLA.QUOTE_EXPIRY_MINUTES * 60 * 1000);

    const breakdown = {
      baseFare,
      distanceKm: Math.round(distanceKm * 10) / 10,
      distanceFare,
      parcelSizeLabel: params.parcelSize,
      parcelMultiplier,
      surcharge,
      total: totalAmount,
      currency: 'KES',
    };

    const savedQuote = await this.prisma.routeQuote.create({
      data: {
        merchantId,
        pricingRuleId: dbRule.id,
        zoneId: zone.id,
        riderShareBps: dbRule.riderShareBps,
        vehicleType: params.vehicleType,
        parcelSize: params.parcelSize,
        pickupLat: params.pickupLat,
        pickupLng: params.pickupLng,
        dropoffLat: params.dropoffLat,
        dropoffLng: params.dropoffLng,
        distanceMeters: route.distanceMeters,
        distanceSource: route.source as any,
        baseFare,
        distanceFare,
        parcelMultiplier,
        surcharge,
        totalAmount,
        currency: 'KES',
        breakdown: breakdown as any,
        expiresAt,
      },
    });

    return {
      quoteId: savedQuote.id,
      zoneName: zone.name,
      vehicleType: params.vehicleType,
      parcelSize: params.parcelSize,
      distanceMeters: route.distanceMeters,
      distanceSource: route.source,
      baseFare,
      distanceFare,
      parcelMultiplier,
      surcharge,
      totalAmount,
      currency: 'KES',
      breakdown,
      pricingRuleVersion: dbRule.version,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getActiveServiceZones() {
    return this.prisma.serviceZone.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, description: true, isActive: true },
    });
  }

  async getValidQuote(quoteId: string, merchantId: string) {
    const quote = await this.prisma.routeQuote.findFirst({ where: { id: quoteId, merchantId } });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.usedAt) {
      throw new BadRequestException({
        error: 'QUOTE_USED',
        message: 'This quote has already been used.',
      });
    }
    if (quote.expiresAt < new Date()) {
      throw new BadRequestException({
        error: 'QUOTE_EXPIRED',
        message: 'Quote has expired. Request a new quote.',
      });
    }
    return quote;
  }
}
