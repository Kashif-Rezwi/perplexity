export const SUGGESTED_FOLLOW_UP_QUESTION_MAX_LENGTH = 160;

const SUGGESTED_FOLLOW_UP_QUESTION_COUNT = 5;

const STANDALONE_SEARCH_QUERY_MAX_LENGTH = 300;

export function sanitizeSuggestedFollowUpQuestions(
  questions: string[],
): string[] {
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

    if (sanitizedQuestions.length === SUGGESTED_FOLLOW_UP_QUESTION_COUNT) {
      break;
    }
  }

  return sanitizedQuestions.length === SUGGESTED_FOLLOW_UP_QUESTION_COUNT
    ? sanitizedQuestions
    : [];
}

export function sanitizeStandaloneSearchQuery(rawSearchQuery: string): string {
  const searchQuery = rawSearchQuery
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();

  return searchQuery.length > STANDALONE_SEARCH_QUERY_MAX_LENGTH
    ? searchQuery.slice(0, STANDALONE_SEARCH_QUERY_MAX_LENGTH).trim()
    : searchQuery;
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
