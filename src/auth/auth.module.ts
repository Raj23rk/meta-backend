import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User, UserSchema } from '../database/schemas/user.schema';
import { Membership, MembershipSchema } from '../database/schemas/membership.schema';
import { Organization, OrganizationSchema } from '../database/schemas/organization.schema';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'waba_saas_super_secure_jwt_secret_key_2026_x',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}

