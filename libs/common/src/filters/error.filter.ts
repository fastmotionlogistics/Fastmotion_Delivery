import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { STATUS } from '../enums';
import { ENVIRONMENT } from '../constants';
/**
 * @filter
 * @description - exception filter for all http exceptions
 */

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  protected readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();

    const request = ctx.getRequest<Request>();

    const status_code = exception.getStatus();

    const status = `${status_code}`.startsWith('2')
      ? STATUS.SUCCESS
      : `${status_code}`.startsWith('4')
      ? STATUS.FAILED
      : STATUS.ERROR;

    console.log(exception.message, status_code, 'HTTP EXCEPTION FILTER!');

    let message = exception.message;

    if (status_code === 404) {
      message = exception.message || `Wrong url '${request.url}'. This url doesn't exist!`;
    }

    const stack = exception.stack;

    this.logger.error(message, {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      stack,
    });

    response.status(status_code).json({
      status: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      stack: process.env.NODE_ENV === ENVIRONMENT.DEVELOPMENT ? stack : undefined,
    });
  }
}
