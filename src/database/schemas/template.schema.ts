import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TemplateDocument = Template & Document;

@Schema({ timestamps: true })
export class Template {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, index: true })
  metaTemplateId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: 'en_US' })
  language: string;

  @Prop({ type: [String], default: ['en_US'] })
  languages: string[];

  @Prop({
    required: true,
    enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
    default: 'MARKETING',
  })
  category: string;

  @Prop({ default: 'CUSTOM' })
  subCategory: string;

  @Prop({
    default: 'APPROVED',
    enum: ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED'],
  })
  status: string;

  @Prop({
    default: 'NONE',
    enum: ['NONE', 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION'],
  })
  headerType: string;

  @Prop({ default: '' })
  headerText: string;

  @Prop({ default: '' })
  headerMediaUrl: string;

  @Prop({ default: '' })
  bodyText: string;

  @Prop({ default: '' })
  footerText: string;

  @Prop({ type: [Object], default: [] })
  buttons: Array<{
    type: string;
    text: string;
    url?: string;
    phoneNumber?: string;
  }>;

  @Prop({ type: [Object], default: [] })
  components: any[];
}

export const TemplateSchema = SchemaFactory.createForClass(Template);
TemplateSchema.index({ organizationId: 1, name: 1, language: 1 }, { unique: true });
TemplateSchema.index({ organizationId: 1, createdAt: -1 });
TemplateSchema.index({ organizationId: 1, status: 1 });
