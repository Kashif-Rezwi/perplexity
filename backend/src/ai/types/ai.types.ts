export type AnswerSource = {
  citationNumber: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
};

export type GenerateAnswerInput = {
  question: string;
  sources?: AnswerSource[];
};
