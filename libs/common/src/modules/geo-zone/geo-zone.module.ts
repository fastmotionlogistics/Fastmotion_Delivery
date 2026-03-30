import { Module } from '@nestjs/common';
import { DatabaseModule, LocationZone, LocationZoneSchema } from '@libs/database';
import { GeoZoneService } from './geo-zone.service';

@Module({
  imports: [
    DatabaseModule.forFeature([{ name: LocationZone.name, schema: LocationZoneSchema }]),
  ],
  providers: [GeoZoneService],
  exports: [GeoZoneService],
})
export class GeoZoneModule {}
