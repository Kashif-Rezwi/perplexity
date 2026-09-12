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

// Groq requires structuredOutputs: false for JSON output on most models. Without
// it the SDK attempts OpenAI-compatible structured outputs which Groq does not
// fully support, causing generation to fail. The JSON instruction is appended to
// the system prompt here rather than in the shared prompt constant so that all
// Groq-specific concerns stay contained within this file.
const GROQ_PROVIDER_OPTIONS: GenerateTextOptions['providerOptions'] = {
  groq: { structuredOutputs: false },
};

const GROQ_SUGGESTION_SYSTEM_PROMPT =
  `${SUGGESTED_FOLLOW_UP_SYSTEM_PROMPT} Output the response as a JSON object containing a "questions" array.`;

type GenerateTextOptions = Parameters<typeof generateText>[0];

type AiSdkModel = GenerateTextOptions['model'];

type AiLogger = Pick<Logger, 'error' | 'warn'>;

type AiSdkBaseInput = {
  model: AiSdkModel;
  abortSignal?: AbortSignal;
  logger: AiLogger;
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

function getStreamErrorDetail(errorPart: unknown): string {
  if (!errorPart) {
    return 'unknown AI error';
  }

  if (typeof errorPart === 'string') {
    return errorPart.trim() || 'unknown AI error';
  }

  if (typeof errorPart === 'object') {
    // Some SDK versions wrap the original provider error inside an envelope
    // shaped like { type: 'error', sequence_number, error: <original> }.
    // Unwrap it before reading fields, guarding against cycles.
    const wrapped = (errorPart as { error?: unknown }).error;
    if (wrapped && wrapped !== errorPart) {
      const unwrappedDetail = getStreamErrorDetail(wrapped);

      if (unwrappedDetail !== 'unknown AI error') {
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

  return 'unknown AI error';
}

export async function generateAnswer({
  model,
  input,
  abortSignal,
  logger,
}: AiSdkBaseInput & { input: GenerateAnswerInput }): Promise<string> {
  try {
    const { text } = await generateText({
      model,
      abortSignal,
      system: ANSWER_SYSTEM_PROMPT,
      prompt: createAnswerPrompt(input),
    });

    const answerMarkdown = text.trim();

    if (!answerMarkdown) {
      throw new InternalServerErrorException('AI returned an empty answer');
    }

    return answerMarkdown;
  } catch (error) {
    if (isKnownAiException(error)) {
      throw error;
    }

    logger.error(
      `AI answer generation failed: ${getErrorMessage(error)}`,
      getErrorStack(error),
    );

    throw new ServiceUnavailableException('AI answer generation failed');
  }
}

export async function* streamAnswer({
  model,
  input,
  abortSignal,
  logger,
  timeoutMs,
}: AiSdkBaseInput & {
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
          const detail = getStreamErrorDetail(part.error);
          logger.error(
            `AI answer stream error: ${detail}`,
            getErrorStack(part.error),
          );
          throw new ServiceUnavailableException(
            `AI answer generation failed: ${detail}`,
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
          'AI response was blocked by the content filter',
        );
      }

      if (finishReason === FINISH_REASON_LENGTH) {
        throw new InternalServerErrorException(
          'AI answer was truncated before any content was generated',
        );
      }

      throw new InternalServerErrorException('AI returned an empty answer');
    }
  } catch (error) {
    if (isKnownAiException(error)) {
      throw error;
    }

    if (isTimeoutError(error)) {
      throw new ServiceUnavailableException('AI answer generation timed out');
    }

    logger.error(
      `AI answer streaming failed: ${getErrorMessage(error)}`,
      getErrorStack(error),
    );

    throw new ServiceUnavailableException('AI answer streaming failed');
  }
}

export async function generateSuggestedFollowUpQuestions({
  model,
  input,
  abortSignal,
  logger,
}: AiSdkBaseInput & {
  input: GenerateSuggestedFollowUpQuestionsInput;
}): Promise<string[]> {
  try {
    const { output } = await generateText({
      model,
      abortSignal,
      system: GROQ_SUGGESTION_SYSTEM_PROMPT,
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
      providerOptions: GROQ_PROVIDER_OPTIONS,
    });

    return sanitizeSuggestedFollowUpQuestions(output.questions);
  } catch (error) {
    if (error instanceof ServiceUnavailableException) {
      throw error;
    }

    logger.warn(
      `AI follow-up suggestion generation failed: ${getErrorMessage(error)}`,
    );

    throw new ServiceUnavailableException(
      'AI follow-up suggestion generation failed',
    );
  }
}

export async function generateStandaloneSearchQuery({
  model,
  input,
  abortSignal,
  logger,
}: AiSdkBaseInput & {
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
        'AI returned an empty search query',
      );
    }

    return searchQuery;
  } catch (error) {
    if (isKnownAiException(error)) {
      throw error;
    }

    logger.warn(
      `AI search query generation failed: ${getErrorMessage(error)}`,
    );

    throw new ServiceUnavailableException('AI search query generation failed');
  }
}

function isKnownAiException(
  error: unknown,
): error is InternalServerErrorException | ServiceUnavailableException {
  return (
    error instanceof InternalServerErrorException ||
    error instanceof ServiceUnavailableException
  );
}

// The Vercel AI SDK does not export a named TimeoutError, so we match on the
// error message. This is intentional — see https://sdk.vercel.ai/docs/reference.
function isTimeoutError(error: unknown): boolean {
  return getErrorMessage(error).toLowerCase().includes('timed out');
}
