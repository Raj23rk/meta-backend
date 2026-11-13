import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ timestamps: true })
export class Contact {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  phone: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ lowercase: true, trim: true })
  email?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ trim: true, index: true })
  group?: string;

  @Prop({
    default: 'opted_in',
    enum: ['opted_in', 'opted_out', 'pending'],
  })
  consentStatus: string;

  @Prop({ default: 'manual_entry' })
  consentSource: string;

  @Prop({ default: Date.now })
  consentTimestamp: Date;

  @Prop({ default: false, index: true })
  optOut: boolean;

  @Prop()
  optOutTimestamp?: Date;

  @Prop({ type: Object, default: {} })
  customFields: Record<string, any>;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
ContactSchema.index({ organizationId: 1, phone: 1 }, { unique: true });

