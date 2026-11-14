import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CampaignDocument = Campaign & Document;

@Schema({ timestamps: true })
export class Campaign {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Template', required: true })
  templateId: Types.ObjectId;

  @Prop({ default: 'all', enum: ['all', 'tags'] })
  audienceType: string;

  @Prop({ type: [String], default: [] })
  targetTags: string[];

  @Prop({
    default: 'draft',
    enum: ['draft', 'scheduled', 'queued', 'processing', 'completed', 'paused', 'cancelled', 'failed'],
  })
  status: string;

  @Prop({
    type: {
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      read: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    default: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
  })
  counters: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };

  @Prop()
  scheduledAt?: Date;

  @Prop()
  completedAt?: Date;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
CampaignSchema.index({ organizationId: 1, createdAt: -1 });
CampaignSchema.index({ organizationId: 1, status: 1 });

