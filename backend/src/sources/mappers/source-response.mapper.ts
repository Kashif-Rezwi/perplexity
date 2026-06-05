import type {
  RecentSourceItem,
  RecentSourceRecord,
} from '../types/source.types';

export function mapRecentSource(source: RecentSourceRecord): RecentSourceItem {
  return {
    sourceId: source.id,
    turnId: source.turn.id,
    threadId: source.turn.thread.id,
    threadTitle: source.turn.thread.title,
    question: source.turn.question,
    link: `/search/${source.turn.thread.id}`,
    citationNumber: source.citationNumber,
    title: source.title,
    url: source.url,
    domain: source.domain,
    snippet: source.snippet,
    provider: source.provider,
    providerScore: source.providerScore,
    publishedAt: source.publishedAt?.toISOString() ?? null,
    createdAt: source.createdAt.toISOString(),
  };
}
