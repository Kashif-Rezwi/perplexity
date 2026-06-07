import type {
  SourceItem,
  SourceRecord,
} from '../types/source.types';

export function mapSource(source: SourceRecord): SourceItem {
  return {
    sourceId: source.id,
    turnId: source.turn.id,
    threadId: source.turn.thread.id,
    threadTitle: source.turn.thread.title,
    question: source.turn.question,
    citationNumber: source.citationNumber,
    title: source.title,
    url: source.url,
    domain: source.domain,
    snippet: source.snippet,
    publishedAt: source.publishedAt?.toISOString() ?? null,
    createdAt: source.createdAt.toISOString(),
  };
}
