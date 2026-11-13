import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PhoneNumberDocument = PhoneNumber & Document;

@Schema({ timestamps: true })
export class PhoneNumber {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'WhatsAppAccount', required: true })
  whatsappAccountId: Types.ObjectId;

  @Prop({ required: true, index: true })
  phoneNumberId: string;

  @Prop({ required: true })
  displayPhoneNumber: string;

  @Prop({ default: '' })
  verifiedName: string;

  @Prop({ default: 'NOT_VERIFIED' })
  codeVerificationStatus: string;

  @Prop({ default: 'GREEN' })
  qualityRating: string;

  @Prop({ default: 'ACTIVE' })
  status: string;
}

export const PhoneNumberSchema = SchemaFactory.createForClass(PhoneNumber);

