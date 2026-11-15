export function createThreadTitle(question: string): string {
  return question.length > 80 ? `${question.slice(0, 77)}...` : question;
}
