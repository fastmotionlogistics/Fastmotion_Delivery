import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { AbstractDocument } from './base.schema';

@Schema({
  collection: 'app_versions',
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false },
  toObject: { virtuals: true, versionKey: false },
})
export class AppVersion extends AbstractDocument {
  @ApiProperty()
  @Prop({ type: String, enum: ['user', 'rider'], required: true, unique: true })
  appType: string; // 'user' or 'rider'

  @ApiProperty()
  @Prop({ type: String, required: true })
  currentVersion: string; // e.g. '2.1.0'

  @ApiProperty()
  @Prop({ type: String, required: true })
  minimumVersion: string; // below this = force update

  @ApiProperty()
  @Prop({ type: Boolean, default: false })
  maintenanceMode: boolean;

  @ApiProperty()
  @Prop({ type: String, default: '' })
  updateTitle: string; // e.g. 'New Version Available!'

  @ApiProperty()
  @Prop({ type: String, default: '' })
  updateMessage: string;

  @ApiProperty()
  @Prop({ type: String, default: '' })
  releaseNotes: string;

  @ApiProperty()
  @Prop({ type: String, default: '' })
  androidStoreUrl: string;

  @ApiProperty()
  @Prop({ type: String, default: '' })
  iosStoreUrl: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AppVersionSchema = SchemaFactory.createForClass(AppVersion);
export type AppVersionDocument = AppVersion & Document;

AppVersionSchema.index({ appType: 1 }, { unique: true });
