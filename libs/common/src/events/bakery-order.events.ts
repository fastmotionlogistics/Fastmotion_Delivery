import { Type } from 'class-transformer';
import { IsArray, IsDate, IsMongoId, IsNotEmpty, IsNumber, IsObject, IsString, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';

export class BakeryOrderCompletedEvent {
  @IsMongoId()
  bakeryId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  bakeryName: string;

  @IsMongoId()
  orderId: Types.ObjectId;

  @IsDate()
  orderDate: Date;

  @IsDate()
  expectedDeliveryDate: Date;

  @IsArray()
  products: any[];
}

export class BakeryOrderCounteredEvent {
  @IsMongoId()
  bakeryId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  bakeryName: string;

  @IsMongoId()
  orderId: Types.ObjectId;

  @IsDate()
  orderDate: Date;

  @IsObject()
  originalOrder: any;

  @IsObject()
  updatedOrder: any;

  @IsString()
  counterReason?: string;

  @IsArray()
  productAdjustments: any[];
}
