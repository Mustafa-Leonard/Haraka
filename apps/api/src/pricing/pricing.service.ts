import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { RoutingService } from './routing.service';
import type { QuoteRequestDto, QuoteResponseDto, VehicleType, ParcelSize } from '@haraka/shared-types';
import { DEFAULT_PRICING, PARCEL_SIZE_MULTIPLIERS, SLA } from '@haraka/config';

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routing: RoutingService,
  ) {}

  async generateQuote(merchantId: string, params: QuoteRequestDto): Promise<QuoteResponseDto> {
    const route = await this.routing.calculateRoute(
      params.pickupLat,
      params.pickupLng,
      params.dropoffLat,
      params.dropoffLng,
    );

    const distanceKm = Math.max(0.5, route.distanceMeters / 1000);

    // Look up pricing rule in DB or use configured defaults
    let baseFare = DEFAULT_PRICING[params.vehicleType]?.baseFare ?? 10000;
    let perKmRate = DEFAULT_PRICING[params.vehicleType]?.perKmRate ?? 4000;
    let minimumFare = DEFAULT_PRICING[params.vehicleType]?.minimumFare ?? 10000;
    let ruleVersion = 1;
    let pricingRuleId = '00000000-0000-0000-0000-000000000001';

    try {
      const dbRule = await this.prisma.pricingRule.findFirst({
        where: {
          vehicleType: params.vehicleType,
          isActive: true,
        },
        orderBy: { version: 'desc' },
      });

      if (dbRule) {
        baseFare = dbRule.baseFare;
        perKmRate = dbRule.perKmRate;
        minimumFare = dbRule.minimumFare;
        ruleVersion = dbRule.version;
        pricingRuleId = dbRule.id;
      }
    } catch {
      // Fallback to constants
    }

    const parcelMultiplier = PARCEL_SIZE_MULTIPLIERS[params.parcelSize] ?? 1.0;
    const distanceFare = Math.round(distanceKm * perKmRate);
    const subtotal = Math.round((baseFare + distanceFare) * parcelMultiplier);
    const totalAmount = Math.max(subtotal, minimumFare);

    const expiresAt = new Date(Date.now() + SLA.QUOTE_EXPIRY_MINUTES * 60 * 1000);

    const breakdown = {
      baseFare,
      distanceKm: Math.round(distanceKm * 10) / 10,
      distanceFare,
      parcelSizeLabel: params.parcelSize,
      parcelMultiplier,
      surcharge: 0,
      total: totalAmount,
      currency: 'KES',
    };

    let quoteId = 'quote-' + Math.random().toString(36).substring(2, 9);
    try {
      const savedQuote = await this.prisma.routeQuote.create({
        data: {
          merchantId,
          pricingRuleId,
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
          surcharge: 0,
          totalAmount,
          currency: 'KES',
          breakdown: breakdown as any,
          expiresAt,
        },
      });
      quoteId = savedQuote.id;
    } catch {
      // Dev mock fallback
    }

    return {
      quoteId,
      vehicleType: params.vehicleType,
      parcelSize: params.parcelSize,
      distanceMeters: route.distanceMeters,
      distanceSource: route.source,
      baseFare,
      distanceFare,
      parcelMultiplier,
      surcharge: 0,
      totalAmount,
      currency: 'KES',
      breakdown,
      pricingRuleVersion: ruleVersion,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async getValidQuote(quoteId: string) {
    try {
      const quote = await this.prisma.routeQuote.findUnique({
        where: { id: quoteId },
      });
      if (!quote) throw new NotFoundException('Quote not found');
      if (quote.expiresAt < new Date()) {
        throw new BadRequestException({ error: 'QUOTE_EXPIRED', message: 'Quote has expired. Request a new quote.' });
      }
      return quote;
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      // Dev fallback quote object
      return {
        id: quoteId,
        totalAmount: 14000,
        currency: 'KES',
        distanceMeters: 3200,
        distanceSource: 'HAVERSINE_ESTIMATE',
        vehicleType: 'BODA',
        parcelSize: 'SMALL',
      };
    }
  }
}
