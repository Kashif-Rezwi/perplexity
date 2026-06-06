import type { SearchResult } from '../../search/types/search.types';

export type GenerateAnswerInput = {
  question: string;
  searchResults?: SearchResult[];
};
