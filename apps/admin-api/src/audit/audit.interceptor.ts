import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuditService } from './audit.service';
import { AUDIT_ACTION_KEY, AuditActionOptions } from './audit-action.decorator';
import { AuditStatusEnum } from '@libs/database';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMeta = this.reflector.get<AuditActionOptions>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    if (!auditMeta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const admin = request.user;
    const ip = request.ip || request.headers?.['x-forwarded-for'] || '';
    const userAgent = request.headers?.['user-agent'] || '';

    const targetId = auditMeta.targetIdParam
      ? request.params?.[auditMeta.targetIdParam]
      : undefined;

    const targetLabel = auditMeta.targetLabelField
      ? request.body?.[auditMeta.targetLabelField]
      : undefined;

    const bodySnapshot = this.sanitizeBody(request.body);

    return next.handle().pipe(
      tap(() => {
        this.auditService.log({
          admin: admin?._id,
          adminName: admin ? `${admin.firstName} ${admin.lastName}` : undefined,
          adminRole: admin?.role,
          action: auditMeta.action,
          category: auditMeta.category,
          targetType: auditMeta.targetType,
          targetId,
          targetLabel,
          status: AuditStatusEnum.SUCCESS,
          ipAddress: ip,
          userAgent,
          newValue: bodySnapshot,
          metadata: {
            method: request.method,
            path: request.url,
          },
        });
      }),
      catchError((err) => {
        this.auditService.log({
          admin: admin?._id,
          adminName: admin ? `${admin.firstName} ${admin.lastName}` : undefined,
          adminRole: admin?.role,
          action: auditMeta.action,
          category: auditMeta.category,
          targetType: auditMeta.targetType,
          targetId,
          targetLabel,
          status: AuditStatusEnum.FAILURE,
          ipAddress: ip,
          userAgent,
          newValue: bodySnapshot,
          metadata: {
            method: request.method,
            path: request.url,
            error: err?.message,
          },
        });
        return throwError(() => err);
      }),
    );
  }

  private sanitizeBody(body: any): Record<string, any> | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const sanitized = { ...body };
    const sensitiveFields = [
      'password',
      'passwordHash',
      'passwordSalt',
      'newPassword',
      'currentPassword',
      'token',
      'secret',
    ];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***';
      }
    }
    return sanitized;
  }
}
