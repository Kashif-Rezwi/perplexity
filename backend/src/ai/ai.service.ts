import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, jsonSchema, Output } from 'ai';
import {
  DEFAULT_OPENAI_MODEL,
  OPENAI_API_KEY_CONFIG_KEY,
  OPENAI_MODEL_CONFIG_KEY,
} from './ai.constants';
import type {
  GenerateAnswerInput,
  GenerateSuggestedFollowUpQuestionsInput,
} from './types/ai.types';

const SOURCE_SNIPPET_MAX_LENGTH = 1200;
const SUGGESTED_FOLLOW_UP_QUESTION_COUNT = 3;
const SUGGESTED_FOLLOW_UP_QUESTION_MAX_LENGTH = 160;

@Injectable()
export class AiService {
  constructor(private readonly configService: ConfigService) {}

  async generateAnswer(input: GenerateAnswerInput): Promise<string> {
    const apiKey = this.getRequiredApiKey();
    const model = this.getModel();
    const openaiClient = createOpenAI({ apiKey });

    try {
      const { text } = await generateText({
        model: openaiClient(model),
        system:
          'You are a concise research assistant. Answer in clear Markdown. ' +
          'Use the provided numbered sources when they are relevant. ' +
          'Cite source-supported claims with [n] markers. ' +
          'Use only citation markers from the provided sources. ' +
          'Use individual citation markers only, like [1][2], never ranges like [1-5] or grouped markers like [1,2]. ' +
          'When sources are provided, do not say you can fetch, check, look up, or obtain more information later. ' +
          'If the provided sources are not fresh or conclusive enough, state that uncertainty clearly.',
        prompt: createAnswerPrompt(input),
      });

      const answerMarkdown = text.trim();

      if (!answerMarkdown) {
        throw new InternalServerErrorException('OpenAI returned an empty answer');
      }

      return answerMarkdown;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new ServiceUnavailableException('OpenAI answer generation failed');
    }
  }

  async generateSuggestedFollowUpQuestions(
    input: GenerateSuggestedFollowUpQuestionsInput,
  ): Promise<string[]> {
    const apiKey = this.getRequiredApiKey();
    const model = this.getModel();
    const openaiClient = createOpenAI({ apiKey });

    try {
      const { output } = await generateText({
        model: openaiClient(model),
        system:
          'You suggest concise next questions for a research answer. ' +
          'Return exactly 3 useful follow-up questions. ' +
          'Each question must be self-contained, natural, and specific to the current thread. ' +
          'Do not include citations, numbering, bullets, explanations, or duplicate questions.',
        prompt: createSuggestedFollowUpQuestionsPrompt(input),
        output: Output.array({
          element: jsonSchema<string>({
            type: 'string',
            minLength: 1,
            maxLength: SUGGESTED_FOLLOW_UP_QUESTION_MAX_LENGTH,
          }),
          name: 'suggestedFollowUpQuestions',
          description: 'Three concise follow-up questions for the user to ask next.',
        }),
      });

      return sanitizeSuggestedFollowUpQuestions(output);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        'OpenAI follow-up suggestion generation failed',
      );
    }
  }

  private getRequiredApiKey(): string {
    const apiKey = this.configService
      .get<string>(OPENAI_API_KEY_CONFIG_KEY)
      ?.trim();

    if (!apiKey) {
      throw new ServiceUnavailableException(
        `${OPENAI_API_KEY_CONFIG_KEY} is not configured`,
      );
    }

    return apiKey;
  }

  getModel(): string {
    return (
      this.configService.get<string>(OPENAI_MODEL_CONFIG_KEY)?.trim() ||
      DEFAULT_OPENAI_MODEL
    );
  }
}

function createAnswerPrompt(input: GenerateAnswerInput): string {
  return [
    `Prior thread context:\n${formatPriorTurns(input.priorTurns ?? [])}`,
    `Question:\n${input.question}`,
    `Sources:\n${formatSources(input.sources ?? [])}`,
    'Write the answer in Markdown.',
  ].join('\n\n');
}

function createSuggestedFollowUpQuestionsPrompt(
  input: GenerateSuggestedFollowUpQuestionsInput,
): string {
  return [
    `Prior thread context:\n${formatPriorTurns(input.priorTurns ?? [])}`,
    `Current question:\n${input.question}`,
    `Current answer:\n${input.answerMarkdown}`,
    `Sources:\n${formatSources(input.sources ?? [])}`,
    'Generate exactly 3 suggested follow-up questions.',
  ].join('\n\n');
}

function formatPriorTurns(priorTurns: GenerateAnswerInput['priorTurns']): string {
  if (!priorTurns?.length) {
    return 'No prior turns.';
  }

  return priorTurns
    .map((turn, index) =>
      [
        `Turn ${index + 1}`,
        `Question: ${turn.question}`,
        `Answer: ${turn.answerMarkdown}`,
      ].join('\n'),
    )
    .join('\n\n');
}

function formatSources(sources: GenerateAnswerInput['sources']): string {
  if (!sources?.length) {
    return 'No sources were returned. Answer from general knowledge only when useful, and do not include citation markers.';
  }

  return sources
    .map((source) =>
      [
        `Source [${source.citationNumber}]`,
        `Title: ${source.title}`,
        `Domain: ${source.domain}`,
        `URL: ${source.url}`,
        `Snippet: ${truncateSourceSnippet(source.snippet)}`,
      ].join('\n'),
    )
    .join('\n\n');
}

function truncateSourceSnippet(snippet: string): string {
  return snippet.length > SOURCE_SNIPPET_MAX_LENGTH
    ? `${snippet.slice(0, SOURCE_SNIPPET_MAX_LENGTH)}...`
    : snippet;
}

function sanitizeSuggestedFollowUpQuestions(questions: string[]): string[] {
  const seenQuestions = new Set<string>();
  const sanitizedQuestions: string[] = [];

  for (const rawQuestion of questions) {
    const question = normalizeSuggestedFollowUpQuestion(rawQuestion);
    const questionKey = question.toLowerCase();

    if (!question || seenQuestions.has(questionKey)) {
      continue;
    }

    seenQuestions.add(questionKey);
    sanitizedQuestions.push(question);

    if (
      sanitizedQuestions.length === SUGGESTED_FOLLOW_UP_QUESTION_COUNT
    ) {
      break;
    }
  }

  return sanitizedQuestions.length === SUGGESTED_FOLLOW_UP_QUESTION_COUNT
    ? sanitizedQuestions
    : [];
}

function normalizeSuggestedFollowUpQuestion(rawQuestion: string): string {
  const question = rawQuestion.replace(/\s+/g, ' ').trim();

  if (!question) {
    return '';
  }

  const clippedQuestion =
    question.length > SUGGESTED_FOLLOW_UP_QUESTION_MAX_LENGTH
      ? question.slice(0, SUGGESTED_FOLLOW_UP_QUESTION_MAX_LENGTH).trim()
      : question;

  return clippedQuestion.endsWith('?') ? clippedQuestion : `${clippedQuestion}?`;
}
