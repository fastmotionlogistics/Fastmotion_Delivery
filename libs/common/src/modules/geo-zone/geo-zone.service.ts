import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LocationZone, ZoneStatusEnum } from '@libs/database';

@Injectable()
export class GeoZoneService {
  constructor(
    @InjectModel(LocationZone.name)
    private readonly zoneModel: Model<LocationZone>,
  ) {}

  /**
   * Finds the highest-priority active zone whose circular boundary contains
   * the given coordinates. Returns null if the point is not in any zone.
   */
  async findZoneByCoordinates(latitude: number, longitude: number): Promise<LocationZone | null> {
    const zones = await this.zoneModel
      .find({ status: ZoneStatusEnum.ACTIVE })
      .sort({ priority: -1 })
      .lean();

    for (const zone of zones) {
      if (zone.centerPoint && zone.radiusKm) {
        const dist = this.haversineDistance(
          latitude,
          longitude,
          zone.centerPoint.latitude,
          zone.centerPoint.longitude,
        );
        if (dist <= zone.radiusKm) return zone;
      }
    }
    return null;
  }

  /** Haversine great-circle distance in kilometres. */
  haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
