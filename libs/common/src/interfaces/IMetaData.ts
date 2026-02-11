/* eslint-disable @typescript-eslint/ban-types */

/**
 * @decorator
 * @description default decorator structure interface
 */

export type IApplyDecorator = <TFunction extends Function, Y>(
  target: Record<string, any> | TFunction,
  propertyKey?: string | symbol,
  descriptor?: TypedPropertyDescriptor<Y>,
) => void;
