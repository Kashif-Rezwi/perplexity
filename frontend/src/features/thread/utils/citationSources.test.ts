import { describe, expect, it } from 'vitest';
import type { SourcePreviewItem } from '@/types/api.types';
import {
  clampCitationSourceIndex,
  findCitationSourceIndex,
  getCitationSourceKey,
  getCitationSourceList,
  resolveCitationActiveIndex,
  resolveCitationActiveIndexByKey,
} from './citationSources';

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
    createdAt: '2026-06-01T00:00:00.000Z',
  };
}

describe('citation source helpers', () => {
  it('uses all sources when present and falls back to the primary source', () => {
    const primary = source('a', 1);
    const allSources = [source('b', 2), primary];

    expect(getCitationSourceList(primary, allSources)).toBe(allSources);
    expect(getCitationSourceList(primary, [])).toEqual([primary]);
    expect(getCitationSourceList(undefined, [])).toEqual([]);
  });

  it('finds sources by sourceId before falling back to citation number', () => {
    const first = source('a', 1);
    const second = source('b', 2);

    expect(findCitationSourceIndex([first, second], second)).toBe(1);
    expect(
      findCitationSourceIndex([first, second], {
        ...source('missing', 2),
        title: 'Canonical source with changed id',
      }),
    ).toBe(1);
  });

  it('resolves the active index after source replacement or reordering', () => {
    const primary = source('a', 1);
    const reorderedSources = [source('b', 2), primary];

    expect(resolveCitationActiveIndex(reorderedSources, primary)).toBe(1);
  });

  it('preserves an active source by identity after source replacement', () => {
    const first = source('a', 1);
    const second = source('b', 2);
    const reorderedSources = [second, first];

    expect(
      resolveCitationActiveIndexByKey(
        reorderedSources,
        getCitationSourceKey(second),
        first,
      ),
    ).toBe(0);
  });

  it('clamps out-of-range indexes when no primary source is available', () => {
    const sources = [source('a', 1), source('b', 2)];

    expect(clampCitationSourceIndex(sources, 9)).toBe(1);
    expect(clampCitationSourceIndex(sources, -2)).toBe(0);
    expect(resolveCitationActiveIndex(sources, undefined, 9)).toBe(1);
    expect(resolveCitationActiveIndex([], undefined, 9)).toBe(0);
  });
});
