import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contact', index: true })
  contactId?: Types.ObjectId;

  @Prop({ default: '' })
  phoneNumberId: string;

  @Prop({ index: true })
  metaMessageId: string;

  @Prop({ required: true, enum: ['inbound', 'outbound'] })
  direction: string;

  @Prop({ default: 'text', enum: ['template', 'text', 'image', 'document', 'interactive'] })
  type: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  templateName?: string;

  @Prop({
    default: 'sent',
    enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
  })
  status: string;

  @Prop()
  errorCode?: string;

  @Prop()
  errorMessage?: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ organizationId: 1, metaMessageId: 1 });
MessageSchema.index({ organizationId: 1, contactId: 1, timestamp: -1 });
MessageSchema.index({ organizationId: 1, createdAt: -1 });
MessageSchema.index({ organizationId: 1, status: 1 });
MessageSchema.index({ organizationId: 1, direction: 1 });
MessageSchema.index({ organizationId: 1, timestamp: -1 });

