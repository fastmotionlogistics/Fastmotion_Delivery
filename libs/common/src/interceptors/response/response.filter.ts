import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import E_RESPONSE from '../../mocks/message';
import { STATUS } from '@libs/common/enums';
import { Message, MessageService } from '@libs/common/modules';
//TODO: log error exceptions

// Restructure Response Object For Guard Exception
@Catch()
export class ResponseFilter implements ExceptionFilter {
  protected readonly logger = new Logger('ResponseFilterError');

  constructor(@Message() private readonly message_service: MessageService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    //intercepting current execution pipeline to get details

    const ctx: HttpArgumentsHost = host.switchToHttp();

    const responseHttp: Response = ctx.getResponse();

    const requestPath: string = ctx.getRequest<Request>().url;

    const requestMethod: string = ctx.getRequest<Request>().method;

    //custom messages from message service module
    const message: string = this.message_service.get(E_RESPONSE.HTTP.SERVER_ERROR.INTERNAL_SERVER_ERROR);

    //handling HTTP Exceptions
    if (exception instanceof HttpException) {
      //grabbing useful informations from excetion object

      const statusHttp: number = exception.getStatus();

      const response: any = exception.getResponse();

      const { error, message } = response;
      //preparing response status from status code
      const status = `${statusHttp}`.startsWith('4') ? STATUS.FAILED : STATUS.ERROR;

      //if error message is neither an array or string
      if (!Array.isArray(message) && typeof message !== 'string') {
        const statusHttp: number = HttpStatus.INTERNAL_SERVER_ERROR;

        responseHttp.status(statusHttp).json({
          status,
          statusCode: statusHttp,
          requestPath,
          requestMethod,
          message,
        });
      }
      //error message is an array
      else if (Array.isArray(message)) {
        responseHttp.status(statusHttp).json({
          status,
          statusCode: statusHttp,
          requestPath,
          requestMethod,
          message: error,
          errors: message,
        });
      }
      //error message is a valid error object
      else {
        responseHttp.status(statusHttp).json({
          status,
          statusCode: statusHttp,
          requestPath,
          requestMethod,
          message,
          stack: exception.stack,
        });
      }
    } else {
      // if error is not http cause - e.g mongoose error and other unhandled exceptions
      if (exception) {
        console.log(exception, 'exceptions');
        let modifiedException = typeof exception === 'string' ? (new Error(exception) as Error) : (exception as Error);

        this.logger.error(modifiedException.message, modifiedException.stack);
      }

      const statusHttp: number = HttpStatus.INTERNAL_SERVER_ERROR;

      responseHttp.status(statusHttp).json({
        status: STATUS.ERROR,
        requestPath,
        requestMethod,
        statusCode: statusHttp,
        message,
      });
    }
  }
}
