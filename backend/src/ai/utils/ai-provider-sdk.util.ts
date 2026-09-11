import {
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { generateText, jsonSchema, Output, streamText } from 'ai';
import { getErrorMessage, getErrorStack } from '../../common/utils/error.util';
import {
  createAnswerPrompt,
  createStandaloneSearchQueryPrompt,
  createSuggestedFollowUpQuestionsPrompt,
  ANSWER_SYSTEM_PROMPT,
  STANDALONE_SEARCH_QUERY_SYSTEM_PROMPT,
  SUGGESTED_FOLLOW_UP_SYSTEM_PROMPT,
} from '../prompts/ai-prompts';
import type {
  GenerateAnswerInput,
  GenerateStandaloneSearchQueryInput,
  GenerateSuggestedFollowUpQuestionsInput,
} from '../types/ai.types';
import {
  sanitizeStandaloneSearchQuery,
  sanitizeSuggestedFollowUpQuestions,
  SUGGESTED_FOLLOW_UP_QUESTION_MAX_LENGTH,
} from './ai-output.util';

const STANDALONE_SEARCH_QUERY_MAX_OUTPUT_TOKENS = 1000;

const FINISH_REASON_CONTENT_FILTER = 'content-filter';
const FINISH_REASON_LENGTH = 'length';

type GenerateTextOptions = Parameters<typeof generateText>[0];

type AiSdkModel = GenerateTextOptions['model'];

type ProviderLogger = Pick<Logger, 'error' | 'warn'>;

type ProviderBaseInput = {
  providerName: string;
  model: AiSdkModel;
  abortSignal?: AbortSignal;
  logger: ProviderLogger;
};

/**
 * Minimal structural view of the parts yielded by `streamText(...).fullStream`.
 *
 * The AI SDK surfaces provider stream errors (billing, rate limits, server
 * errors, content filtering, ...) as `{ type: 'error', error }` parts instead
 * of throwing. Reading only `textStream` hides them, so we read `fullStream`
 * and inspect `text-delta`, `error`, and `finish` parts explicitly.
 */
type FullStreamPart = {
  type: string;
  text?: unknown;
  error?: unknown;
  errorText?: unknown;
  finishReason?: unknown;
};

function getFinishReason(part: FullStreamPart): string {
  const reason = part.finishReason;

  if (typeof reason === 'string') {
    return reason;
  }

  if (reason && typeof reason === 'object') {
    const unified = (reason as { unified?: unknown }).unified;
    if (typeof unified === 'string') {
      return unified;
    }
  }

  return '';
}

function getProviderStreamErrorDetail(errorPart: unknown): string {
  if (!errorPart) {
    return 'unknown provider error';
  }

  if (typeof errorPart === 'string') {
    return errorPart.trim() || 'unknown provider error';
  }

  if (typeof errorPart === 'object') {
    // Some SDK versions wrap the original provider error inside an envelope
    // shaped like { type: 'error', sequence_number, error: <original> }.
    // Unwrap it before reading fields, guarding against cycles.
    const wrapped = (errorPart as { error?: unknown }).error;
    if (wrapped && wrapped !== errorPart) {
      const unwrappedDetail = getProviderStreamErrorDetail(wrapped);

      if (unwrappedDetail !== 'unknown provider error') {
        return unwrappedDetail;
      }
    }

    const error = errorPart as {
      message?: unknown;
      code?: unknown;
      type?: unknown;
      name?: unknown;
    };

    for (const candidate of [error.message, error.code, error.type, error.name]) {
      if (
        typeof candidate === 'string' &&
        candidate.trim() &&
        candidate.trim() !== 'error'
      ) {
        return candidate.trim();
      }
    }
  }

  return 'unknown provider error';
}

export async function generateProviderAnswer({
  providerName,
  model,
  input,
  abortSignal,
  logger,
}: ProviderBaseInput & { input: GenerateAnswerInput }): Promise<string> {
  try {
    const { text } = await generateText({
      model,
      abortSignal,
      system: ANSWER_SYSTEM_PROMPT,
      prompt: createAnswerPrompt(input),
    });

    const answerMarkdown = text.trim();

    if (!answerMarkdown) {
      throw new InternalServerErrorException(
        `${providerName} returned an empty answer`,
      );
    }

    return answerMarkdown;
  } catch (error) {
    if (isKnownProviderException(error)) {
      throw error;
    }

    logger.error(
      `${providerName} answer generation failed: ${getErrorMessage(error)}`,
      getErrorStack(error),
    );

    throw new ServiceUnavailableException(
      `${providerName} answer generation failed`,
    );
  }
}

export async function* streamProviderAnswer({
  providerName,
  model,
  input,
  abortSignal,
  logger,
  timeoutMs,
}: ProviderBaseInput & {
  input: GenerateAnswerInput;
  timeoutMs: number;
}): AsyncIterable<string> {
  let finishReason = '';
  let accumulatedAnswer = '';

  try {
    const result = streamText({
      model,
      abortSignal,
      timeout: timeoutMs,
      system: ANSWER_SYSTEM_PROMPT,
      prompt: createAnswerPrompt(input),
    });
    const fullStream = result.fullStream as AsyncIterable<FullStreamPart>;

    for await (const part of fullStream) {
      switch (part.type) {
        case 'text-delta': {
          const textPart = typeof part.text === 'string' ? part.text : '';
          accumulatedAnswer += textPart;
          yield textPart;
          break;
        }

        case 'error': {
          const detail = getProviderStreamErrorDetail(part.error);
          logger.error(
            `${providerName} answer stream error: ${detail}`,
            getErrorStack(part.error),
          );
          throw new ServiceUnavailableException(
            `${providerName} answer generation failed: ${detail}`,
          );
        }

        case 'finish': {
          finishReason = getFinishReason(part);
          break;
        }

        default:
          break;
      }
    }

    // The provider completed without an explicit `error` part, but produced
    // no usable text. Use the finish reason to give the failure a meaning.
    if (!accumulatedAnswer.trim()) {
      if (finishReason === FINISH_REASON_CONTENT_FILTER) {
        throw new InternalServerErrorException(
          `${providerName} response was blocked by the content filter`,
        );
      }

      if (finishReason === FINISH_REASON_LENGTH) {
        throw new InternalServerErrorException(
          `${providerName} answer was truncated before any content was generated`,
        );
      }

      throw new InternalServerErrorException(
        `${providerName} returned an empty answer`,
      );
    }
  } catch (error) {
    if (isKnownProviderException(error)) {
      throw error;
    }

    if (isTimeoutError(error)) {
      throw new ServiceUnavailableException(
        `${providerName} answer generation timed out`,
      );
    }

    logger.error(
      `${providerName} answer streaming failed: ${getErrorMessage(error)}`,
      getErrorStack(error),
    );

    throw new ServiceUnavailableException(
      `${providerName} answer streaming failed`,
    );
  }
}

export async function generateProviderSuggestedFollowUpQuestions({
  providerName,
  model,
  input,
  abortSignal,
  logger,
  systemPrompt = SUGGESTED_FOLLOW_UP_SYSTEM_PROMPT,
  providerOptions,
}: ProviderBaseInput & {
  input: GenerateSuggestedFollowUpQuestionsInput;
  systemPrompt?: string;
  providerOptions?: GenerateTextOptions['providerOptions'];
}): Promise<string[]> {
  try {
    const { output } = await generateText({
      model,
      abortSignal,
      system: systemPrompt,
      prompt: createSuggestedFollowUpQuestionsPrompt(input),
      output: Output.object({
        schema: jsonSchema<{ questions: string[] }>({
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: SUGGESTED_FOLLOW_UP_QUESTION_MAX_LENGTH,
              },
            },
          },
          required: ['questions'],
        }),
      }),
      providerOptions,
    });

    return sanitizeSuggestedFollowUpQuestions(output.questions);
  } catch (error) {
    if (error instanceof ServiceUnavailableException) {
      throw error;
    }

    logger.warn(
      `${providerName} follow-up suggestion generation failed: ${getErrorMessage(
        error,
      )}`,
    );

    throw new ServiceUnavailableException(
      `${providerName} follow-up suggestion generation failed`,
    );
  }
}

export async function generateProviderStandaloneSearchQuery({
  providerName,
  model,
  input,
  abortSignal,
  logger,
}: ProviderBaseInput & {
  input: GenerateStandaloneSearchQueryInput;
}): Promise<string> {
  try {
    const { text } = await generateText({
      model,
      abortSignal,
      maxOutputTokens: STANDALONE_SEARCH_QUERY_MAX_OUTPUT_TOKENS,
      system: STANDALONE_SEARCH_QUERY_SYSTEM_PROMPT,
      prompt: createStandaloneSearchQueryPrompt(input),
    });
    const searchQuery = sanitizeStandaloneSearchQuery(text);

    if (!searchQuery) {
      throw new InternalServerErrorException(
        `${providerName} returned an empty search query`,
      );
    }

    return searchQuery;
  } catch (error) {
    if (isKnownProviderException(error)) {
      throw error;
    }

    logger.warn(
      `${providerName} search query generation failed: ${getErrorMessage(
        error,
      )}`,
    );

    throw new ServiceUnavailableException(
      `${providerName} search query generation failed`,
    );
  }
}

function isKnownProviderException(
  error: unknown,
): error is InternalServerErrorException | ServiceUnavailableException {
  return (
    error instanceof InternalServerErrorException ||
    error instanceof ServiceUnavailableException
  );
}

function isTimeoutError(error: unknown): boolean {
  return getErrorMessage(error).toLowerCase().includes('timed out');
}
