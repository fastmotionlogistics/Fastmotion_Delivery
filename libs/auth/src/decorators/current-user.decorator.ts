import { ExecutionContext, createParamDecorator } from '@nestjs/common';

const getCurrentUserByContext = (ctx: ExecutionContext): any => {
  return ctx.switchToHttp().getRequest().user;
};

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  getCurrentUserByContext(context),
);
