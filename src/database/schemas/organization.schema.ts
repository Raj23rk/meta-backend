import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true })
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: 'active', enum: ['active', 'suspended'] })
  status: string;

  @Prop({ default: 'starter', enum: ['free', 'starter', 'pro', 'enterprise'] })
  plan: string;

  @Prop({
    type: {
      monthlyQuota: { type: Number, default: 10000 },
      currentMonthUsage: { type: Number, default: 0 },
      wabaConnected: { type: Boolean, default: false },
    },
    default: {},
  })
  settings: {
    monthlyQuota: number;
    currentMonthUsage: number;
    wabaConnected: boolean;
  };
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

