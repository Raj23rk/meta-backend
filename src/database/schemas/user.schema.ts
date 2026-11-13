import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: 'active', enum: ['active', 'inactive', 'suspended'] })
  status: string;

  @Prop({
    type: {
      name: { type: String, required: true },
      avatar: { type: String },
      phone: { type: String },
    },
    required: true,
  })
  profile: {
    name: string;
    avatar?: string;
    phone?: string;
  };

  @Prop({ default: false })
  isSuperAdmin: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

