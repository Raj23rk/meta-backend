import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WebhookEventDocument = WebhookEvent & Document;

@Schema({ timestamps: true })
export class WebhookEvent {
  @Prop({ required: true, unique: true, index: true })
  providerEventId: string;

  @Prop({ required: true })
  eventType: string;

  @Prop({ type: Object, required: true })
  rawPayload: Record<string, any>;

  @Prop({ default: Date.now })
  receivedAt: Date;

  @Prop({ default: 'processed', enum: ['processed', 'failed', 'duplicate'] })
  processingStatus: string;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);

