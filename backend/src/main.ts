import { Logger, type LogLevel, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/http/global-exception.filter';
import { RequestLoggingInterceptor } from './common/http/request-logging.interceptor';

type ExpressInstance = {
  disable(setting: string): void;
  set(setting: string, value: boolean): void;
};

type HeaderResponse = {
  setHeader(name: string, value: string): void;
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const express = app.getHttpAdapter().getInstance() as ExpressInstance;
  const port = configService.getOrThrow<number>('PORT');
  const host = configService.getOrThrow<string>('HOST');
  const corsOrigins = parseCorsOrigins(
    configService.get<string>('CORS_ORIGINS', ''),
  );

  app.useLogger(
    resolveLogLevels(configService.get<string>('LOG_LEVEL', 'log')),
  );
  app.enableShutdownHooks();
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  express.disable('x-powered-by');
  express.set(
    'trust proxy',
    configService.get<boolean>('TRUST_PROXY', false),
  );

  app.use((_request: unknown, response: HeaderResponse, next: () => void) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    next();
  });

  if (corsOrigins.length > 0) {
    app.enableCors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      credentials: false,
      maxAge: 86_400,
    });
  }

  await app.listen(port, host);
  Logger.log(`Backend listening on http://${host}:${port}`, 'Bootstrap');
}

void bootstrap();

function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveLogLevels(level: string): LogLevel[] {
  const levels: LogLevel[] = ['error'];

  if (['warn', 'log', 'debug', 'verbose'].includes(level)) {
    levels.push('warn');
  }
  if (['log', 'debug', 'verbose'].includes(level)) {
    levels.push('log');
  }
  if (['debug', 'verbose'].includes(level)) {
    levels.push('debug');
  }
  if (level === 'verbose') {
    levels.push('verbose');
  }

  return levels;
}
