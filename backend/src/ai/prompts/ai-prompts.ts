import type { GenerateAnswerInput, GenerateStandaloneSearchQueryInput, GenerateSuggestedFollowUpQuestionsInput } from '../types/ai.types';

const SOURCE_SNIPPET_MAX_LENGTH = 1200;

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

export const ANSWER_SYSTEM_PROMPT =
  'You are a concise research assistant. Answer in clear Markdown. ' +
  'Use the provided numbered sources to support your answer. ' +
  'Cite every source-supported claim with [n] markers inline. ' +
  'Use only citation markers that correspond to provided sources. ' +
  'Use individual citation markers only, like [1][2] — never ranges like [1-5] or grouped markers like [1,2]. ' +
  'Do not say you can fetch, check, look up, or obtain more information later. ' +
  'If the provided sources are not fresh or conclusive enough, state that uncertainty clearly.';

export const SUGGESTED_FOLLOW_UP_SYSTEM_PROMPT =
  'You predict the next questions a user is likely to type into a research assistant after reading an answer. ' +
  'Every question you generate is written from the user\'s point of view — it is something the user sends to the AI, never something the AI asks back. ' +
  'Each question must dig deeper into the topic, explore a related angle, compare alternatives, or ask for a practical how-to based on what the current answer covered. ' +
  'Each question must be fully self-contained and understandable without reading the conversation. ' +
  'Never ask the user about their intent, background, use case, or preferences. ' +
  'Never ask the AI to confirm, repeat, or elaborate on something already fully answered. ' +
  'Do not include numbering, bullets, citations, or explanations — output questions only.';

export const STANDALONE_SEARCH_QUERY_SYSTEM_PROMPT =
  'You rewrite contextual follow-up questions into standalone web search queries. ' +
  'Use prior thread context only to resolve references, omitted subjects, places, dates, and entities. ' +
  'Return exactly one concise search query as plain text. ' +
  'Do not include explanations, bullets, quotation marks, or citations. ' +
  'If the current question is already fully standalone, return it unchanged.';

// ---------------------------------------------------------------------------
// User prompt builders
// ---------------------------------------------------------------------------

export function createAnswerPrompt(input: GenerateAnswerInput): string {
  return [
    `Prior thread context:\n${formatPriorTurnsForAnswer(input.priorTurns ?? [])}`,
    `Sources:\n${formatSourcesForAnswer(input.sources ?? [])}`,
    `Current Question:\n${input.question}`,
    'Write the answer in Markdown.',
  ].join('\n\n');
}

export function createSuggestedFollowUpQuestionsPrompt(
  input: GenerateSuggestedFollowUpQuestionsInput,
): string {
  return [
    `Prior questions in this thread:\n${formatPriorTurnsForSuggestions(input.priorTurns ?? [])}`,
    `Current question (asked by the user):\n${input.question}`,
    `Current answer (given by the AI):\n${input.answerMarkdown}`,
    `Source titles used in this answer:\n${formatSourcesForSuggestions(input.sources ?? [])}`,
    // The closing instruction is intentionally brief — the system prompt owns the rules.
    'Generate exactly 5 follow-up questions.',
  ].join('\n\n');
}

export function createStandaloneSearchQueryPrompt(
  input: GenerateStandaloneSearchQueryInput,
): string {
  return [
    `Thread title:\n${input.threadTitle?.trim() || 'Unknown thread title.'}`,
    `Recent thread context:\n${formatPriorTurnsForAnswer(input.priorTurns)}`,
    `Current follow-up question:\n${input.question}`,
    'Rewrite the current follow-up question into one standalone web search query.',
  ].join('\n\n');
}

// ---------------------------------------------------------------------------
// Prior turn formatters
// ---------------------------------------------------------------------------

/** Full Q+A format — used by answer generation and search query rewrite. */
function formatPriorTurnsForAnswer(priorTurns: GenerateAnswerInput['priorTurns']): string {
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

/**
 * Questions-only format — used by suggestion generation.
 * Full answer text is not needed to predict next questions and would waste tokens.
 */
function formatPriorTurnsForSuggestions(priorTurns: GenerateAnswerInput['priorTurns']): string {
  if (!priorTurns?.length) {
    return 'None — this is the opening question.';
  }

  return priorTurns
    .map((turn, index) => `Q${index + 1}: ${turn.question}`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Source formatters
// ---------------------------------------------------------------------------

/** Full source format with snippet — used by answer generation. */
function formatSourcesForAnswer(sources: GenerateAnswerInput['sources']): string {
  if (!sources?.length) {
    return 'No sources available. Answer from general knowledge only when useful, and omit citation markers.';
  }

  return sources
    .map((source) =>
      [
        `Source [${source.citationNumber}]: ${source.title}`,
        `URL: ${source.url}`,
        `Snippet: ${truncateSourceSnippet(source.snippet)}`,
      ].join('\n'),
    )
    .join('\n\n');
}

/**
 * Title-only format — used by suggestion generation.
 * URLs, domains, and snippets are irrelevant for predicting the user's next question.
 */
function formatSourcesForSuggestions(sources: GenerateAnswerInput['sources']): string {
  if (!sources?.length) {
    return 'No external sources were used.';
  }

  return sources
    .map((source) => `- ${source.title}`)
    .join('\n');
}

function truncateSourceSnippet(snippet: string): string {
  return snippet.length > SOURCE_SNIPPET_MAX_LENGTH
    ? `${snippet.slice(0, SOURCE_SNIPPET_MAX_LENGTH)}...`
    : snippet;
}
