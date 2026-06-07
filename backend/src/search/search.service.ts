import type { SearchInput, SearchResult } from './types/search.types';

export abstract class SearchService {
  abstract search(input: SearchInput): Promise<SearchResult[]>;
}
