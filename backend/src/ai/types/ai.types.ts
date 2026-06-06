export type AnswerSource = {
  citationNumber: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
};

export type PriorTurn = {
  question: string;
  answerMarkdown: string;
};

export type GenerateAnswerInput = {
  question: string;
  priorTurns?: PriorTurn[];
  sources?: AnswerSource[];
};
