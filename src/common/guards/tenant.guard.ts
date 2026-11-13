import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Membership, MembershipDocument } from '../../database/schemas/membership.schema';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @InjectModel(Membership.name)
    private membershipModel: Model<MembershipDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Super Admin has global platform access if explicitly bypassing tenant filter
    if (user.isSuperAdmin && !request.headers['x-organization-id']) {
      return true;
    }

    // Determine target organization from headers or request parameters or body
    const headerOrgId = request.headers['x-organization-id'];
    const paramOrgId = request.params.organizationId || request.params.orgId;
    const bodyOrgId = request.body?.organizationId;

    const orgId = headerOrgId || paramOrgId || bodyOrgId;

    if (!orgId) {
      throw new BadRequestException('Organization identifier (X-Organization-Id header) is required');
    }

    if (!Types.ObjectId.isValid(orgId)) {
      throw new BadRequestException('Invalid Organization ID format');
    }

    // Verify user belongs to this organization
    const membership = await this.membershipModel.findOne({
      organizationId: new Types.ObjectId(orgId),
      userId: new Types.ObjectId(user.id || user._id),
    });

    if (!membership && !user.isSuperAdmin) {
      throw new ForbiddenException('Access denied: You are not a member of this organization');
    }

    // Attach verified organization context and role to the request
    request.organizationId = orgId;
    request.membership = membership;
    request.currentRole = membership ? membership.role : 'super_admin';

    return true;
  }
}

