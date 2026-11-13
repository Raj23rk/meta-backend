import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WhatsAppAccountDocument = WhatsAppAccount & Document;

@Schema({ timestamps: true })
export class WhatsAppAccount {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, index: true })
  wabaId: string;

  @Prop({ default: 'pending', enum: ['connected', 'disconnected', 'pending', 'error'] })
  connectionStatus: string;

  @Prop({ required: true })
  encryptedAccessToken: string;

  @Prop({ default: '' })
  verifiedName: string;

  @Prop({ default: 'UNKNOWN' })
  qualityRating: string;

  @Prop({ type: Object, default: {} })
  rawMetaAccountData: Record<string, any>;
}

export const WhatsAppAccountSchema = SchemaFactory.createForClass(WhatsAppAccount);

