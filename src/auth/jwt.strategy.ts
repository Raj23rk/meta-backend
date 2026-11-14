import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../database/schemas/user.schema';
import { FastMemoryCache } from '../common/utils/cache.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'waba_saas_super_secure_jwt_secret_key_2026_x',
    });
  }

  async validate(payload: any) {
    const cacheKey = `user:${payload.sub}`;
    const cachedUser = FastMemoryCache.get<any>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    const user: any = await this.userModel.findById(payload.sub).select('-passwordHash').lean();
    if (!user || user.status === 'suspended') {
      throw new UnauthorizedException('User account is invalid or suspended');
    }

    const userData = {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      profile: user.profile,
      isSuperAdmin: user.isSuperAdmin,
    };

    FastMemoryCache.set(cacheKey, userData, 60000); // 60-second TTL
    return userData;
  }
}

