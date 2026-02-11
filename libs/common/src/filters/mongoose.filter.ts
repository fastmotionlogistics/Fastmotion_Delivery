import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { MongoError } from 'mongodb';
import { Error } from 'mongoose';
import { Request, Response } from 'express';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';

import { IMongooseError } from '@libs/common/interfaces';
import {
  handleCastErrorDB,
  handleCastObjectId,
  handleDuplicateErrorDB,
  handleValidationErrorDB,
} from '../interceptors/response/helpers';
import { ENVIRONMENT, MONGOOSE } from '../constants';
import { STATUS } from '../enums';

//TODO: log error exceptions

// Restructure Response Object For Guard Exception
@Catch(MongoError, Error)
export class MongooseExceptionFilter implements ExceptionFilter {
  protected readonly logger = new Logger(MongooseExceptionFilter.name);

  catch(exception: IMongooseError, host: ArgumentsHost): void {
    //current request execution context
    const ctx: HttpArgumentsHost = host.switchToHttp();

    //getting currently processed request and response
    const response = ctx.getResponse<Response>();

    const request = ctx.getRequest<Request>();

    //default exception message - unmodified
    let message = exception.message;

    //detcting is current exception is a Casterror type
    let isCast = false;

    //checking if error has been handled by any of the defined hooks
    let handled = false;

    //default bas exception status code
    let status_code = HttpStatus.BAD_REQUEST;

    //error stack
    const stack = exception.stack;

    //handle error on development - show vague errors
    if (process.env.NODE_ENV === ENVIRONMENT.DEVELOPMENT) {
      response.status(status_code).json({
        status: STATUS.FAILED,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message,
        stack,
      });

      //log error

      this.logger.error(exception.message, exception.stack);

      // mark error as handled
      handled = true;

      return;
    }

    //DURING PRODUCTION:

    // DUPLICATE ERROR (MORE THAN ONE VALUE)
    if (exception.code === 11000) {
      status_code = HttpStatus.CONFLICT;

      message = handleDuplicateErrorDB(exception);

      //mark error as handled
      handled = true;
    }

    // CAST ERROR (INVALID VALUE / TYPE)
    if (exception.stack.includes(MONGOOSE.CAST_ERROR) && exception.kind !== MONGOOSE.OBJECT_ID) {
      message = handleCastErrorDB(exception);
      //mark error as CAST_ERROR to Avoid further processing by other hooks
      isCast = true;

      //mark error as handled
      handled = true;
    }

    // VALIDATION ERROR (VALUE DOESN'T MATCH EXPECTED VALUE IN SCHEMA)

    if (!isCast && exception.name === MONGOOSE.VALIDATION_ERROR) {
      message = handleValidationErrorDB(exception);

      //mark error as handled
      handled = true;
    }

    // // CAST  OBJECTID (INVALID OBJECTID)
    if (exception.kind == MONGOOSE.OBJECT_ID) {
      status_code = HttpStatus.BAD_REQUEST;

      message = handleCastObjectId(exception as unknown as Error.CastError);

      //mark error as handled
      handled = true;
    }

    //if no hook processed the exception error - return default message
    if (!handled) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: STATUS.ERROR,
        message,
      });

      return;
    }

    //log error
    this.logger.error(exception.message, exception.stack);

    //return handled error
    response.status(status_code).json({
      status: STATUS.FAILED,
      timestamp: new Date().toISOString(),
      path: request.url,
      request: request.method,
      message,
    });
  }
}
