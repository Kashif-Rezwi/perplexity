import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { getErrorMessage, getErrorStack } from '../utils/error.util';
import type { RequestWithContext } from './request-logging.interceptor';

type ErrorResponse = {
  error?: string;
  message?: string | string[];
};

type WritableResponse = {
  headersSent?: boolean;
  json(body: unknown): void;
  status(code: number): WritableResponse;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<WritableResponse>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const publicError = isHttpException
      ? normalizeHttpError(exception)
      : { message: 'Internal server error' };
    const logEntry = JSON.stringify({
      event: 'request_failed',
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode,
      exception: exception instanceof Error ? exception.name : 'UnknownError',
      message: getErrorMessage(exception, 'Unknown error'),
    });

    if (statusCode >= 500) {
      this.logger.error(logEntry, getErrorStack(exception));
    } else {
      this.logger.warn(logEntry);
    }

    if (response.headersSent) {
      return;
    }

    response.status(statusCode).json({
      statusCode,
      ...publicError,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
    });
  }
}

function normalizeHttpError(exception: HttpException): ErrorResponse {
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return { message: response };
  }

  const errorResponse = response as ErrorResponse;

  return {
    ...(errorResponse.error ? { error: errorResponse.error } : {}),
    message: errorResponse.message ?? exception.message,
  };
}
