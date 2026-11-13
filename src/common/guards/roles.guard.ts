import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../database/schemas/membership.schema';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(Role | string)[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const currentRole = request.currentRole || (user?.isSuperAdmin ? Role.SUPER_ADMIN : null);

    if (user?.isSuperAdmin) {
      return true;
    }

    if (!currentRole || !requiredRoles.includes(currentRole)) {
      throw new ForbiddenException(
        `Insufficient permissions. Required role: ${requiredRoles.join(' or ')}. Your role: ${currentRole || 'none'}`,
      );
    }

    return true;
  }
}

