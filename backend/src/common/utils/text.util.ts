export const ANSWER_PREVIEW_MAX_LENGTH = 300;

export function createThreadTitle(question: string): string {
  return question.length > 80 ? `${question.slice(0, 77)}...` : question;
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks entirely
    .replace(/`([^`]+)`/g, '$1') // Remove inline code markers
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic
    .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
    .replace(/^#{1,6}\s+/gm, '') // Remove headings
    .replace(/^\s*>\s+/gm, '') // Remove blockquotes
    .replace(/\n+/g, ' ') // Convert newlines to spaces
    .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
    .trim();
}

export function createAnswerPreview(answerMarkdown: string): string {
  const plainText = stripMarkdown(answerMarkdown);
  return plainText.length > ANSWER_PREVIEW_MAX_LENGTH
    ? plainText.slice(0, ANSWER_PREVIEW_MAX_LENGTH)
    : plainText;
}
