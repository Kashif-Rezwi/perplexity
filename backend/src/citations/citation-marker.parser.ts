const CITATION_MARKER_PATTERN = /\[(\d+)\]/g;

export function extractCitationNumbers(
  answerMarkdown: string,
  validCitationNumbers: readonly number[],
): number[] {
  const validNumbers = new Set(validCitationNumbers);
  const seenNumbers = new Set<number>();
  const citationNumbers: number[] = [];

  for (const match of answerMarkdown.matchAll(CITATION_MARKER_PATTERN)) {
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
