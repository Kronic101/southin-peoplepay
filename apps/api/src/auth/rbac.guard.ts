import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_ROLES_KEY, AppRole } from './roles.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const enforcementEnabled =
      String(process.env.RBAC_ENFORCEMENT_ENABLED || 'false').toLowerCase() === 'true';

    if (!enforcementEnabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const roleHeader =
      request.headers['x-user-role'] ||
      request.headers['x-dev-user-role'] ||
      request.headers['x-role'];

    if (!roleHeader) {
      throw new UnauthorizedException({
        message: 'RBAC role header is required.',
        requiredRoles,
        hint: 'For dev testing, send x-user-role: PAYROLL_OFFICER, HR_MANAGER, FINANCE_MANAGER, DIRECTOR, or ADMIN.',
      });
    }

    const userRoles = String(roleHeader)
      .split(',')
      .map((role) => role.trim().toUpperCase())
      .filter(Boolean);

    const isAdmin = userRoles.includes('ADMIN');
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!isAdmin && !hasRequiredRole) {
      throw new ForbiddenException({
        message: 'You do not have permission to perform this action.',
        requiredRoles,
        userRoles,
      });
    }

    return true;
  }
}