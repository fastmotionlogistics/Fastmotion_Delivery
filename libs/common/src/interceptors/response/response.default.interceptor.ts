import { NestInterceptor, ExecutionContext, CallHandler, mixin, Type, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Message, MessageService } from '@libs/common/modules';
import { REQUEST_METHODS } from '@libs/common/constants';
import { STATUS } from '@libs/common/enums';

// This interceptor for restructure response success
export function ResponseDefaultInterceptor(reply?: string): Type<NestInterceptor> {
  class MixinResponseDefaultInterceptor implements NestInterceptor<Promise<any>> {
    protected readonly logger = new Logger('DefaultResponseInterceptor');

    constructor(@Message() private readonly message_service: MessageService) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<Promise<any> | string>> {
      //preparing response from current execution  context
      const ctx: HttpArgumentsHost = context.switchToHttp();

      const responseExpress = ctx.getResponse<Response>();

      const requestExpress = ctx.getRequest<Request>().method;

      return next.handle().pipe(
        map(async (response: Promise<Record<string, any>>) => {
          //handle status message dependinng on response code
          const status = `${responseExpress.statusCode}`.startsWith('2')
            ? true
            : `${responseExpress.statusCode}`.startsWith('4')
            ? false
            : false;

          // gettin response Payload
          const data: Record<string, any> = await response;

          //get corrensponding message from message service
          const message: string = this.message_service.get(reply);

          //log mutation request success

          if (
            requestExpress === REQUEST_METHODS.POST ||
            requestExpress === REQUEST_METHODS.PATCH ||
            requestExpress === REQUEST_METHODS.DELETE
          ) {
            this.logger.log({ message, data });
          }

          //prepare response and return

          return {
            success: status,
            message,
            data,
          };
        }),
      );
    }
  }

  return mixin(MixinResponseDefaultInterceptor);
}
