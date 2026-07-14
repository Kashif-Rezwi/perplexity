import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs';

export type RequestWithContext = {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  originalUrl?: string;
  requestId?: string;
  url: string;
};

type ResponseWithStatus = {
  setHeader(name: string, value: string): void;
  statusCode: number;
};

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<ResponseWithStatus>();
    const requestId = resolveRequestId(request.headers['x-request-id']);
    const startedAt = Date.now();
    let failed = false;

    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    return next.handle().pipe(
      tap({
        error: () => {
          failed = true;
        },
      }),
      finalize(() => {
        if (failed) {
          return;
        }

        this.logger.log(
          JSON.stringify({
            event: 'request_completed',
            requestId,
            method: request.method,
            path: request.originalUrl ?? request.url,
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
          }),
        );
      }),
    );
  }
}

function resolveRequestId(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (candidate && /^[A-Za-z0-9._-]{1,128}$/.test(candidate)) {
    return candidate;
  }

  return randomUUID();
}
