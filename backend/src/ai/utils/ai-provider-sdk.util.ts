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

type GenerateTextOptions = Parameters<typeof generateText>[0];

type AiSdkModel = GenerateTextOptions['model'];

type ProviderLogger = Pick<Logger, 'error' | 'warn'>;

type ProviderBaseInput = {
  providerName: string;
  model: AiSdkModel;
  abortSignal?: AbortSignal;
  logger: ProviderLogger;
};

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
  try {
    const result = streamText({
      model,
      abortSignal,
      timeout: timeoutMs,
      system: ANSWER_SYSTEM_PROMPT,
      prompt: createAnswerPrompt(input),
    });
    let hasOutput = false;

    for await (const textPart of result.textStream) {
      hasOutput = true;
      yield textPart;
    }

    if (!hasOutput) {
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
