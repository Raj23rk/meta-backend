import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SegmentDocument = Segment & Document;

@Schema({ _id: false })
export class SegmentFilter {
  @Prop({ required: true, default: 'tags' })
  field: string;

  @Prop({ required: true, default: 'is' })
  attribute: string;

  @Prop({ required: true })
  value: string;
}

@Schema({ timestamps: true })
export class Segment {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: [SegmentFilter], default: [] })
  filters: SegmentFilter[];

  @Prop({ default: 0 })
  contactCount: number;
}

export const SegmentSchema = SchemaFactory.createForClass(Segment);
SegmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });

