import {
  Injectable,
  ExecutionContext,
  CanActivate,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { AdminPermissionEnum, AdminRoleEnum, ROLE_PERMISSIONS } from '@libs/database';

// ── Passport Guards ─────────────────────────────────────
@Injectable()
export class AdminJwtAuthGuard extends AuthGuard('admin-jwt') {}

@Injectable()
export class AdminLocalAuthGuard extends AuthGuard('admin-local') {}

// ── Permission Metadata Keys ────────────────────────────
export const PERMISSIONS_KEY = 'admin_permissions';
export const ROLES_KEY = 'admin_roles';

// ── Decorators ──────────────────────────────────────────
export const RequirePermissions = (...permissions: AdminPermissionEnum[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireRoles = (...roles: AdminRoleEnum[]) =>
  SetMetadata(ROLES_KEY, roles);

// ── Permission Guard ────────────────────────────────────
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<AdminPermissionEnum[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredRoles = this.reflector.getAllAndOverride<AdminRoleEnum[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no specific requirements, allow access (just needs to be authenticated admin)
    if (!requiredPermissions?.length && !requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const admin = request.user;

    if (!admin) {
      throw new ForbiddenException('Not authenticated');
    }

    // Super admin bypasses all permission checks
    if (admin.role === AdminRoleEnum.SUPER_ADMIN) {
      return true;
    }

    // Check role requirement
    if (requiredRoles?.length) {
      if (!requiredRoles.includes(admin.role as AdminRoleEnum)) {
        throw new ForbiddenException(
          `This action requires one of these roles: ${requiredRoles.join(', ')}`,
        );
      }
    }

    // Check permission requirement
    if (requiredPermissions?.length) {
      // Merge role-default permissions + custom permissions
      const rolePerms = ROLE_PERMISSIONS[admin.role as AdminRoleEnum] || [];
      const allPermissions = new Set([...rolePerms, ...(admin.permissions || [])]);

      const hasAll = requiredPermissions.every((p) => allPermissions.has(p));
      if (!hasAll) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    return true;
  }
}
