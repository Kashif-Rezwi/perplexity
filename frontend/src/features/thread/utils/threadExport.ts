import type {
  SourceItem,
  SourcePreviewItem,
  ThreadDetailResponse,
} from '@/types/api.types';

type ExportTurnInput = {
  question: string;
  answerMarkdown: string | null;
  sources?: Array<SourceItem | SourcePreviewItem>;
};

export function createThreadUrl(
  threadId: string,
  origin = getCurrentOrigin(),
): string {
  return `${normalizeOrigin(origin)}/thread/${encodeURIComponent(threadId)}`;
}

export function createTurnUrl(
  threadId: string,
  turnId: string,
  origin = getCurrentOrigin(),
): string {
  return `${createThreadUrl(threadId, origin)}#turn-${encodeURIComponent(
    turnId,
  )}`;
}

export function serializeTurnMarkdown(turn: ExportTurnInput): string {
  const parts = [`## ${turn.question.trim()}`];

  if (turn.answerMarkdown?.trim()) {
    parts.push(turn.answerMarkdown.trim());
  }

  const sourceAppendix = serializeSourcesMarkdown(turn.sources ?? []);
  if (sourceAppendix) {
    parts.push(sourceAppendix);
  }

  return parts.join('\n\n');
}

export function serializeTurnPlainText(turn: ExportTurnInput): string {
  return markdownToPlainText(serializeTurnMarkdown(turn));
}

export function serializeThreadMarkdown(thread: ThreadDetailResponse): string {
  const turns = thread.turns
    .filter((turn) => turn.answerMarkdown?.trim())
    .map((turn) => serializeTurnMarkdown(turn));

  return [`# ${thread.title.trim()}`, ...turns].join('\n\n---\n\n');
}

export function serializeThreadPlainText(thread: ThreadDetailResponse): string {
  return markdownToPlainText(serializeThreadMarkdown(thread));
}

export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```$/, ''),
    )
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/!\[([^\]]*)]\(([^)]+)\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '- ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function serializeSourcesMarkdown(
  sources: Array<SourceItem | SourcePreviewItem>,
): string {
  if (sources.length === 0) {
    return '';
  }

  const uniqueSources = sources.filter(
    (source, index, allSources) =>
      allSources.findIndex((item) => item.sourceId === source.sourceId) ===
      index,
  );

  return [
    '### Sources',
    ...uniqueSources.map((source) => {
      const title = source.title?.trim() || source.domain || source.url;
      return `${source.citationNumber}. [${title}](${source.url})`;
    }),
  ].join('\n');
}

function getCurrentOrigin(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}
