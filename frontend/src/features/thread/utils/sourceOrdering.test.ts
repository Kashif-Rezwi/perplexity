import { describe, expect, it } from 'vitest';
import type { SourcePreviewItem } from '@/types/api.types';
import { sortSourcesForLinks } from './sourceOrdering';

function source(
  sourceId: string,
  citationNumber: number,
): SourcePreviewItem {
  return {
    sourceId,
    citationNumber,
    title: `Source ${sourceId}`,
    url: `https://example.com/${sourceId}`,
    domain: 'example.com',
    snippet: `Snippet ${sourceId}`,
    publishedAt: null,
    createdAt: '2026-06-24T00:00:00.000Z',
  };
}

describe('sortSourcesForLinks', () => {
  it('orders links by citation number regardless of fetch order', () => {
    const sources = [
      source('source-5', 5),
      source('source-2', 2),
      source('source-4', 4),
      source('source-1', 1),
      source('source-3', 3),
    ];

    expect(sortSourcesForLinks(sources).map((item) => item.sourceId)).toEqual([
      'source-1',
      'source-2',
      'source-3',
      'source-4',
      'source-5',
    ]);
  });

  it('does not mutate the input array', () => {
    const sources = [source('source-2', 2), source('source-1', 1)];

    expect(sortSourcesForLinks(sources)).not.toBe(sources);
    expect(sources.map((item) => item.sourceId)).toEqual([
      'source-2',
      'source-1',
    ]);
  });
});
