import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { Membership, MembershipSchema } from '../database/schemas/membership.schema';
import { User, UserSchema } from '../database/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Membership.name, schema: MembershipSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}

