import {
  extractCitationNumbers,
  normalizeCitationMarkers,
} from '../parsers/citation-marker.parser';
import type { CreateTurnSourceInput } from '../../sources/types/source-persistence.types';

export type PreparedAnswerCitations = {
  answerMarkdown: string;
  citationNumbers: number[];
};

export function prepareAnswerCitations(
  answerMarkdown: string,
  sources: CreateTurnSourceInput[],
): PreparedAnswerCitations {
  const validCitationNumbers = sources.map((source) => source.citationNumber);
  const normalizedAnswerMarkdown = normalizeCitationMarkers(
    answerMarkdown,
    validCitationNumbers,
  );

  return {
    answerMarkdown: normalizedAnswerMarkdown,
    citationNumbers: extractCitationNumbers(
      normalizedAnswerMarkdown,
      validCitationNumbers,
    ),
  };
}
