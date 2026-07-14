const NODE_ENV_VALUES = new Set(['development', 'test', 'production']);
const AI_PROVIDER_VALUES = new Set(['openai', 'groq']);
const LOG_LEVEL_VALUES = new Set(['error', 'warn', 'log', 'debug', 'verbose']);
const TAVILY_SEARCH_DEPTH_VALUES = new Set([
  'basic',
  'advanced',
  'fast',
  'ultra-fast',
]);

const POSITIVE_INTEGER_KEYS = [
  'OPENAI_ANSWER_TIMEOUT_MS',
  'OPENAI_QUERY_REWRITE_TIMEOUT_MS',
  'OPENAI_SUGGESTION_TIMEOUT_MS',
  'GROQ_ANSWER_TIMEOUT_MS',
  'GROQ_QUERY_REWRITE_TIMEOUT_MS',
  'GROQ_SUGGESTION_TIMEOUT_MS',
  'TAVILY_MAX_RESULTS',
  'TAVILY_SEARCH_TIMEOUT_MS',
] as const;

type Environment = Record<string, unknown>;

export function validateEnvironment(input: Environment): Environment {
  const environment = { ...input };
  const nodeEnv = getOptionalString(environment, 'NODE_ENV', 'development');
  const aiProvider = getOptionalString(environment, 'AI_PROVIDER', 'openai');
  const logLevel = getOptionalString(environment, 'LOG_LEVEL', 'log');

  assertAllowedValue('NODE_ENV', nodeEnv, NODE_ENV_VALUES);
  assertAllowedValue('AI_PROVIDER', aiProvider, AI_PROVIDER_VALUES);
  assertAllowedValue('LOG_LEVEL', logLevel, LOG_LEVEL_VALUES);

  environment.NODE_ENV = nodeEnv;
  environment.AI_PROVIDER = aiProvider;
  environment.LOG_LEVEL = logLevel;
  environment.HOST = getOptionalString(environment, 'HOST', '0.0.0.0');
  environment.PORT = getIntegerInRange(environment, 'PORT', 8080, 1, 65_535);
  environment.TRUST_PROXY = getBoolean(environment, 'TRUST_PROXY', false);

  const databaseUrl = getRequiredString(environment, 'DATABASE_URL');
  assertPostgresUrl(databaseUrl);
  environment.DATABASE_URL = databaseUrl;

  environment.TAVILY_API_KEY = getRequiredString(environment, 'TAVILY_API_KEY');
  const searchDepth = getOptionalString(
    environment,
    'TAVILY_SEARCH_DEPTH',
    'basic',
  );
  assertAllowedValue(
    'TAVILY_SEARCH_DEPTH',
    searchDepth,
    TAVILY_SEARCH_DEPTH_VALUES,
  );
  environment.TAVILY_SEARCH_DEPTH = searchDepth;

  const providerApiKey =
    aiProvider === 'groq' ? 'GROQ_API_KEY' : 'OPENAI_API_KEY';
  environment[providerApiKey] = getRequiredString(environment, providerApiKey);

  for (const key of POSITIVE_INTEGER_KEYS) {
    const rawValue = getOptionalString(environment, key);

    if (rawValue) {
      environment[key] = String(
        getIntegerInRange(
          environment,
          key,
          undefined,
          1,
          Number.MAX_SAFE_INTEGER,
        ),
      );
    }
  }

  environment.CORS_ORIGINS = validateCorsOrigins(
    getOptionalString(
      environment,
      'CORS_ORIGINS',
      nodeEnv === 'production' ? '' : 'http://localhost:3001',
    ),
  );

  return environment;
}

function getRequiredString(environment: Environment, key: string): string {
  const value = getOptionalString(environment, key);

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function getOptionalString(
  environment: Environment,
  key: string,
  defaultValue = '',
): string {
  const value = environment[key];

  if (typeof value !== 'string') {
    return defaultValue;
  }

  return value.trim() || defaultValue;
}

function getIntegerInRange(
  environment: Environment,
  key: string,
  defaultValue: number | undefined,
  minimum: number,
  maximum: number,
): number {
  const rawValue = getOptionalString(environment, key);

  if (!rawValue && defaultValue !== undefined) {
    return defaultValue;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${key} must be an integer from ${minimum} to ${maximum}`);
  }

  return value;
}

function getBoolean(
  environment: Environment,
  key: string,
  defaultValue: boolean,
): boolean {
  const rawValue = getOptionalString(environment, key);

  if (!rawValue) {
    return defaultValue;
  }

  if (rawValue !== 'true' && rawValue !== 'false') {
    throw new Error(`${key} must be either true or false`);
  }

  return rawValue === 'true';
}

function assertAllowedValue(
  key: string,
  value: string,
  allowedValues: Set<string>,
) {
  if (!allowedValues.has(value)) {
    throw new Error(`${key} must be one of: ${[...allowedValues].join(', ')}`);
  }
}

function assertPostgresUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error(
      'DATABASE_URL must use the postgresql:// or postgres:// protocol',
    );
  }
}

function validateCorsOrigins(value: string): string {
  if (!value) {
    return '';
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of origins) {
    if (origin === '*') {
      throw new Error(
        'CORS_ORIGINS must list explicit origins; wildcard CORS is disabled',
      );
    }

    let url: URL;

    try {
      url = new URL(origin);
    } catch {
      throw new Error(`CORS_ORIGINS contains an invalid origin: ${origin}`);
    }

    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error(
        `CORS_ORIGINS must contain HTTP(S) origins without paths: ${origin}`,
      );
    }
  }

  return [...new Set(origins)].join(',');
}
