import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UsageRecordDocument = UsageRecord & Document;

@Schema({ timestamps: true })
export class UsageRecord {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION', 'SERVICE'],
    default: 'MARKETING',
  })
  category: string;

  @Prop({ default: 1 })
  quantity: number;

  @Prop({ default: 0 })
  metaPricingEstimate: number;

  @Prop({ required: true, index: true })
  period: string; // YYYY-MM

  @Prop({ default: Date.now })
  date: Date;
}

export const UsageRecordSchema = SchemaFactory.createForClass(UsageRecord);
UsageRecordSchema.index({ organizationId: 1, period: 1 });

