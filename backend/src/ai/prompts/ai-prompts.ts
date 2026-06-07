import type { GenerateAnswerInput, GenerateStandaloneSearchQueryInput, GenerateSuggestedFollowUpQuestionsInput } from '../types/ai.types';

const SOURCE_SNIPPET_MAX_LENGTH = 1200;

export const ANSWER_SYSTEM_PROMPT =
  'You are a concise research assistant. Answer in clear Markdown. ' +
  'Use the provided numbered sources when they are relevant. ' +
  'Cite source-supported claims with [n] markers. ' +
  'Use only citation markers from the provided sources. ' +
  'Use individual citation markers only, like [1][2], never ranges like [1-5] or grouped markers like [1,2]. ' +
  'When sources are provided, do not say you can fetch, check, look up, or obtain more information later. ' +
  'If the provided sources are not fresh or conclusive enough, state that uncertainty clearly.';

export const SUGGESTED_FOLLOW_UP_SYSTEM_PROMPT =
  'You suggest concise next questions for a research answer. ' +
  'Return exactly 3 useful follow-up questions. ' +
  'Each question must be self-contained, natural, and specific to the current thread. ' +
  'Do not include citations, numbering, bullets, explanations, or duplicate questions.';

export const STANDALONE_SEARCH_QUERY_SYSTEM_PROMPT =
  'You rewrite contextual follow-up questions into standalone web search queries. ' +
  'Use prior thread context only to resolve references, omitted subjects, places, dates, and entities. ' +
  'Return exactly one concise search query as plain text. ' +
  'Do not include explanations, bullets, quotation marks, or citations. ' +
  'If the current question is already standalone, return it unchanged.';

export function createAnswerPrompt(input: GenerateAnswerInput): string {
  return [
    `Prior thread context:\n${formatPriorTurns(input.priorTurns ?? [])}`,
    `Question:\n${input.question}`,
    `Sources:\n${formatSources(input.sources ?? [])}`,
    'Write the answer in Markdown.',
  ].join('\n\n');
}

export function createSuggestedFollowUpQuestionsPrompt(
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

export function createStandaloneSearchQueryPrompt(
  input: GenerateStandaloneSearchQueryInput,
): string {
  return [
    `Thread title:\n${input.threadTitle?.trim() || 'Unknown thread title.'}`,
    `Recent compact thread context:\n${formatPriorTurns(input.priorTurns)}`,
    `Current follow-up question:\n${input.question}`,
    'Rewrite the current follow-up question into one standalone web search query.',
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
