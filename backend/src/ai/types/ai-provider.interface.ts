import {
  GenerateAnswerInput,
  GenerateStandaloneSearchQueryInput,
  GenerateSuggestedFollowUpQuestionsInput,
} from './ai.types';

export interface AiProvider {
  generateAnswer(
    input: GenerateAnswerInput,
    abortSignal?: AbortSignal,
  ): Promise<string>;

  streamAnswer(
    input: GenerateAnswerInput,
    abortSignal?: AbortSignal,
  ): AsyncIterable<string>;

  generateSuggestedFollowUpQuestions(
    input: GenerateSuggestedFollowUpQuestionsInput,
    abortSignal?: AbortSignal,
  ): Promise<string[]>;

  generateStandaloneSearchQuery(
    input: GenerateStandaloneSearchQueryInput,
    abortSignal?: AbortSignal,
  ): Promise<string>;

  getAnswerTimeoutMs(): number;
  getQueryRewriteTimeoutMs(): number;
  getSuggestionTimeoutMs(): number;
}
