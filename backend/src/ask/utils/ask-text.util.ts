export const ANSWER_PREVIEW_MAX_LENGTH = 300;

export function createThreadTitle(question: string): string {
  return question.length > 80 ? `${question.slice(0, 77)}...` : question;
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function createAnswerPreview(answerMarkdown: string): string {
  const plainText = stripMarkdown(answerMarkdown);
  return plainText.length > ANSWER_PREVIEW_MAX_LENGTH
    ? plainText.slice(0, ANSWER_PREVIEW_MAX_LENGTH)
    : plainText;
}
