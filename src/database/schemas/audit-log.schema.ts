import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', index: true })
  organizationId?: Types.ObjectId;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  target: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ organizationId: 1, timestamp: -1 });

