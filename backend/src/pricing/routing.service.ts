import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { DistanceSource } from '@haraka/shared-types';

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  source: DistanceSource;
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(private readonly config: ConfigService) {}

  async calculateRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<RouteResult> {
    const provider = this.config.get<string>('ROUTING_PROVIDER', 'haversine');
    const osrmBase = this.config.get<string>('OSRM_BASE_URL', 'http://router.project-osrm.org');

    if (provider === 'osrm') {
      try {
        const url = `${osrmBase}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
        const res = await axios.get(url, { timeout: 3000 });
        const route = res.data?.routes?.[0];

        if (route && typeof route.distance === 'number') {
          return {
            distanceMeters: Math.round(route.distance),
            durationSeconds: Math.round(route.duration || 0),
            source: 'OSRM',
          };
        }
      } catch (err: any) {
        this.logger.debug(`OSRM route calculation failed (${err.message}). Using Haversine fallback.`);
      }
    }

    // Haversine fallback with coastal road winding factor (1.3)
    const straightLineMeters = this.calculateHaversine(originLat, originLng, destLat, destLng);
    const roadFactor = this.config.get<number>('HAVERSINE_ROAD_FACTOR', 1.3);
    const estimatedDistance = Math.round(straightLineMeters * roadFactor);
    // Estimate coastal urban speed: ~30 km/h (8.33 m/s)
    const estimatedDuration = Math.round(estimatedDistance / 8.33);

    return {
      distanceMeters: estimatedDistance,
      durationSeconds: estimatedDuration,
      source: 'HAVERSINE_ESTIMATE',
    };
  }

  private calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
