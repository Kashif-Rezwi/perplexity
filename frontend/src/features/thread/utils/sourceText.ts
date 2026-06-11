export function cleanSnippetText(text: string): string {
  if (!text) return '';

  return text
    .replace(/^#+\s+/, '')
    .replace(/^[*-+]\s+/, '')
    .trim();
}
