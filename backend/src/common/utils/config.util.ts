import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

export function getRequiredTrimmedConfig(
  configService: ConfigService,
  key: string,
): string {
  const value = getOptionalTrimmedConfig(configService, key);

  if (!value) {
    throw new ServiceUnavailableException(`${key} is not configured`);
  }

  return value;
}

export function getOptionalTrimmedConfig(
  configService: ConfigService,
  key: string,
  defaultValue = '',
): string {
  return configService.get<string>(key)?.trim() || defaultValue;
}

export function getPositiveIntegerConfig(
  configService: ConfigService,
  key: string,
  defaultValue: number,
): number {
  const rawValue = configService.get<string | number>(key);

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return defaultValue;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < 1) {
    throw new ServiceUnavailableException(`${key} must be a positive integer`);
  }

  return value;
}
