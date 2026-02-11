import { ExceptionFilter, Catch, ArgumentsHost, HttpException, WsExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Request, Response } from 'express';
import { Socket } from 'socket.io';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const name = exception.message;

    const message = exception.getResponse() as {
      statusCode: number;
      message: string[] | string;
      response: string[] | string;
    };

    const messageEval = Array.isArray(message.message)
      ? `${message.message.join('\n\n')}`
      : message.message ?? message.response;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: messageEval,
    });
  }
}

@Catch(WsException)
export class WebsocketExceptionFilter implements WsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const ctx = host.switchToWs();
    const client: Socket = ctx.getClient();
    const data = ctx.getData();

    const error = exception.getError();
    const errorName = exception.name;

    const errorPayload = {
      status: 'error',
      error: {
        name: errorName,
        message: exception.message,
        details: error,
        timestamp: new Date().toISOString(),
        path: client.nsp.name + client.request.url,
        payload: data,
      },
    };

    client.emit('exception', errorPayload);
  }
}
