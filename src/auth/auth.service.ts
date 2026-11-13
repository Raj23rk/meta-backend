import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../database/schemas/user.schema';
import { Membership, MembershipDocument, Role } from '../database/schemas/membership.schema';
import { Organization, OrganizationDocument } from '../database/schemas/organization.schema';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Membership.name) private membershipModel: Model<MembershipDocument>,
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.userModel.findOne({ email: loginDto.email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    // Fetch user memberships and organizations
    const memberships = await this.membershipModel
      .find({ userId: user._id })
      .populate('organizationId')
      .exec();

    const organizations = memberships.map((m: any) => ({
      id: m.organizationId._id.toString(),
      name: m.organizationId.name,
      status: m.organizationId.status,
      plan: m.organizationId.plan,
      role: m.role,
    }));

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.profile.name,
      isSuperAdmin: user.isSuperAdmin,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.profile.name,
        avatar: user.profile.avatar,
        isSuperAdmin: user.isSuperAdmin,
      },
      organizations,
      defaultOrganization: organizations[0] || null,
    };
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.userModel.findOne({ email: registerDto.email.toLowerCase() });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(registerDto.password, salt);

    // Create user
    const user = await this.userModel.create({
      email: registerDto.email.toLowerCase(),
      passwordHash,
      status: 'active',
      profile: {
        name: registerDto.name,
      },
      isSuperAdmin: false,
    });

    // Create default Organization for this client
    const organization = await this.organizationModel.create({
      name: registerDto.companyName,
      status: 'active',
      plan: 'starter',
      settings: {
        monthlyQuota: 10000,
        currentMonthUsage: 0,
        wabaConnected: false,
      },
    });

    // Assign as Client Admin
    await this.membershipModel.create({
      organizationId: organization._id,
      userId: user._id,
      role: Role.CLIENT_ADMIN,
    });

    return this.login({
      email: registerDto.email,
      password: registerDto.password,
    });
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-passwordHash');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const memberships = await this.membershipModel
      .find({ userId: user._id })
      .populate('organizationId')
      .exec();

    const organizations = memberships.map((m: any) => ({
      id: m.organizationId._id.toString(),
      name: m.organizationId.name,
      status: m.organizationId.status,
      plan: m.organizationId.plan,
      role: m.role,
    }));

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.profile.name,
        avatar: user.profile.avatar,
        isSuperAdmin: user.isSuperAdmin,
      },
      organizations,
    };
  }
}

