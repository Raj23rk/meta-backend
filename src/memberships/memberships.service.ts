import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Membership, MembershipDocument, Role } from '../database/schemas/membership.schema';
import { User, UserDocument } from '../database/schemas/user.schema';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectModel(Membership.name) private membershipModel: Model<MembershipDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findByOrganization(organizationId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const memberships = await this.membershipModel
      .find({ organizationId: orgObjId })
      .populate('userId', '-passwordHash');

    return memberships.map((m: any) => ({
      id: m._id.toString(),
      role: m.role,
      user: m.userId,
      createdAt: m.createdAt,
    }));
  }

  async addMember(organizationId: string, data: { email: string; name: string; role: Role; password?: string }) {
    const orgObjId = new Types.ObjectId(organizationId);
    const email = data.email.toLowerCase().trim();

    // Check if user already exists
    let user = await this.userModel.findOne({ email });
    if (!user) {
      const defaultPass = data.password || 'Welcome@123';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPass, salt);

      user = await this.userModel.create({
        email,
        passwordHash,
        status: 'active',
        profile: { name: data.name },
        isSuperAdmin: false,
      });
    }

    // Check if already a member
    const existingMembership = await this.membershipModel.findOne({
      organizationId: orgObjId,
      userId: user._id,
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this organization');
    }

    const membership = await this.membershipModel.create({
      organizationId: orgObjId,
      userId: user._id,
      role: data.role || Role.AGENT,
    });

    return {
      id: membership._id.toString(),
      role: membership.role,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.profile.name,
      },
    };
  }

  async removeMember(organizationId: string, membershipId: string) {
    const orgObjId = new Types.ObjectId(organizationId);
    const result = await this.membershipModel.findOneAndDelete({
      _id: new Types.ObjectId(membershipId),
      organizationId: orgObjId,
    });
    if (!result) throw new NotFoundException('Membership not found');
    return { success: true };
  }
}

