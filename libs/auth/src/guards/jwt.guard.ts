import { Role } from '@libs/common';
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
const IS_PUBLIC_KEY = 'isPublic';
const ROLES_KEY = 'roles';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }
  override canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const is_public = this.reflector.getAllAndOverride<boolean>('public', [context.getHandler(), context.getClass()]);

    if (is_public) {
      return is_public;
    }

    return super.canActivate(context);
  }

  override handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());

    // No roles required — just return the authenticated user
    if (!requiredRoles) {
      return user;
    }

    if (requiredRoles.some((role) => user.type === role)) {
      if (user.isDeleted) throw new UnauthorizedException('Account Has Been Deleted');
      if (!user.isActive)
        throw new UnauthorizedException('Account Has Been Deactivated, Contact Support For Assistance');
      return user;
    } else {
      throw new UnauthorizedException('Insufficient role permissions');
    }
  }
}
