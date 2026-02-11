import { Inject } from '@nestjs/common';
// import { PROVIDERS } from '@core/common/constants';

/**
 * @decorator inject message service via decorator
 */

export function Message(): (target: Record<string, any>, key: string | symbol, index?: number) => void {
  return Inject('MessageService');
}
