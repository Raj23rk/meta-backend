import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CampaignRecipientDocument = CampaignRecipient & Document;

@Schema({ timestamps: true })
export class CampaignRecipient {
  @Prop({ type: Types.ObjectId, ref: 'Campaign', required: true, index: true })
  campaignId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contact', required: true })
  contactId: Types.ObjectId;

  @Prop({ required: true })
  phone: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'queued', 'sent', 'delivered', 'read', 'failed'],
  })
  status: string;

  @Prop({ default: 0 })
  attempts: number;

  @Prop()
  errorMessage?: string;

  @Prop()
  metaMessageId?: string;

  @Prop()
  sentAt?: Date;
}

export const CampaignRecipientSchema = SchemaFactory.createForClass(CampaignRecipient);
CampaignRecipientSchema.index({ campaignId: 1, contactId: 1 }, { unique: true });

