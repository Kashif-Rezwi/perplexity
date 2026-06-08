export type SearchDepth = 'basic' | 'advanced' | 'fast' | 'ultra-fast';

export type SearchInput = {
  query: string;
};

export type SearchResult = {
  title: string;
  url: string;
  content: string;
  score: number | null;
  publishedAt: string | null;
};
