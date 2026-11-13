import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MembershipDocument = Membership & Document;

export enum Role {
  SUPER_ADMIN = 'super_admin',
  CLIENT_ADMIN = 'client_admin',
  AGENT = 'agent',
}

@Schema({ timestamps: true })
export class Membership {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: Role, default: Role.AGENT })
  role: Role;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);
MembershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

