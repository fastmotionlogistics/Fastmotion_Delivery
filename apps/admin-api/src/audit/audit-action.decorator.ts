import { SetMetadata } from '@nestjs/common';
import { AuditCategoryEnum } from '@libs/database';

export const AUDIT_ACTION_KEY = 'audit_action';

export interface AuditActionOptions {
  action: string;
  category: AuditCategoryEnum;
  targetType?: string;
  /** Route param name that contains the target ID (e.g. 'id') */
  targetIdParam?: string;
  /** Body field to use as target label (e.g. 'reason') */
  targetLabelField?: string;
}

export const AuditAction = (options: AuditActionOptions) =>
  SetMetadata(AUDIT_ACTION_KEY, options);
