import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  DeliveryRequest,
  DeliveryRequestSchema,
  Rider,
  RiderSchema,
  ChatMessage,
  ChatMessageSchema,
} from '@libs/database';
import { DeliveryGateway } from './delivery.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryRequest.name, schema: DeliveryRequestSchema },
      { name: Rider.name, schema: RiderSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [DeliveryGateway],
  exports: [DeliveryGateway],
})
export class GatewayModule {}
