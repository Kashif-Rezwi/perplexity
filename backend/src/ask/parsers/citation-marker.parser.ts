const CITATION_MARKER_PATTERN = /\[(\d+)\]/g;
const CITATION_GROUP_PATTERN = /\[([0-9,\-\s]+)\]/g;
const CITATION_RANGE_PATTERN = /^(\d+)\s*-\s*(\d+)$/;
const CITATION_NUMBER_PATTERN = /^\d+$/;

export function normalizeCitationMarkers(
  answerMarkdown: string,
  validCitationNumbers: readonly number[],
): string {
  const validNumbers = new Set(validCitationNumbers);

  return answerMarkdown.replace(CITATION_GROUP_PATTERN, (marker, group) => {
    const citationNumbers = parseCitationGroup(group, validNumbers);

    return citationNumbers.length > 0
      ? citationNumbers.map((citationNumber) => `[${citationNumber}]`).join('')
      : marker;
  });
}

/**
 * Extracts unique citation numbers from `answerMarkdown` in first-seen order.
 *
 * Internally normalizes range markers (e.g. `[1-3]` → `[1][2][3]`) and
 * comma-grouped markers (e.g. `[1, 3]`) before extraction. Callers that
 * pre-normalize the input before passing it here get idempotent behavior —
 * running normalization twice on already-normalized text has no effect.
 *
 * Only returns numbers that appear in `validCitationNumbers`.
 */
export function extractCitationNumbers(
  answerMarkdown: string,
  validCitationNumbers: readonly number[],
): number[] {
  const normalizedAnswerMarkdown = normalizeCitationMarkers(
    answerMarkdown,
    validCitationNumbers,
  );
  const validNumbers = new Set(validCitationNumbers);
  const seenNumbers = new Set<number>();
  const citationNumbers: number[] = [];

  for (const match of normalizedAnswerMarkdown.matchAll(CITATION_MARKER_PATTERN)) {
    const citationNumber = Number(match[1]);

    if (
      !Number.isSafeInteger(citationNumber) ||
      !validNumbers.has(citationNumber) ||
      seenNumbers.has(citationNumber)
    ) {
      continue;
    }

    seenNumbers.add(citationNumber);
    citationNumbers.push(citationNumber);
  }

  return citationNumbers;
}

function parseCitationGroup(
  group: string,
  validNumbers: ReadonlySet<number>,
): number[] {
  const seenNumbers = new Set<number>();
  const citationNumbers: number[] = [];

  for (const token of group.split(',')) {
    addCitationToken(token.trim(), validNumbers, seenNumbers, citationNumbers);
  }

  return citationNumbers;
}

function addCitationToken(
  token: string,
  validNumbers: ReadonlySet<number>,
  seenNumbers: Set<number>,
  citationNumbers: number[],
): void {
  const rangeMatch = token.match(CITATION_RANGE_PATTERN);

  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);

    if (start > end) {
      return;
    }

    for (let citationNumber = start; citationNumber <= end; citationNumber += 1) {
      addCitationNumber(citationNumber, validNumbers, seenNumbers, citationNumbers);
    }

    return;
  }

  if (!CITATION_NUMBER_PATTERN.test(token)) {
    return;
  }

  addCitationNumber(Number(token), validNumbers, seenNumbers, citationNumbers);
}

function addCitationNumber(
  citationNumber: number,
  validNumbers: ReadonlySet<number>,
  seenNumbers: Set<number>,
  citationNumbers: number[],
): void {
  if (
    !Number.isSafeInteger(citationNumber) ||
    !validNumbers.has(citationNumber) ||
    seenNumbers.has(citationNumber)
  ) {
    return;
  }

  seenNumbers.add(citationNumber);
  citationNumbers.push(citationNumber);
}
