export type CreateTurnSourceInput = {
  citationNumber: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  provider: string;
  providerScore: number | null;
  publishedAt: Date | null;
};
