import { describe, expect, it } from 'vitest';
import type { ThreadHistoryItem } from './historyStore';
import { upsertThreadHistoryItem } from './historyStore';

function thread(
  id: string,
  overrides: Partial<ThreadHistoryItem> = {},
): ThreadHistoryItem {
  return {
    id,
    title: `Thread ${id}`,
    mode: 'web',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('upsertThreadHistoryItem', () => {
  it('moves an existing thread to the top when updatedAt is newer', () => {
    const existing = [
      thread('newest', { updatedAt: '2026-06-03T00:00:00.000Z' }),
      thread('target', { updatedAt: '2026-06-01T00:00:00.000Z' }),
      thread('oldest', { updatedAt: '2026-05-30T00:00:00.000Z' }),
    ];

    const result = upsertThreadHistoryItem(
      existing,
      thread('target', {
        title: 'Updated target',
        updatedAt: '2026-06-04T00:00:00.000Z',
      }),
    );

    expect(result.map((item) => item.id)).toEqual([
      'target',
      'newest',
      'oldest',
    ]);
    expect(result[0].title).toBe('Updated target');
  });

  it('updates metadata in place when updatedAt is unchanged', () => {
    const existing = [
      thread('first', { updatedAt: '2026-06-03T00:00:00.000Z' }),
      thread('target', { updatedAt: '2026-06-01T00:00:00.000Z' }),
    ];

    const result = upsertThreadHistoryItem(
      existing,
      thread('target', {
        title: 'Renamed target',
        isPinned: true,
        updatedAt: '2026-06-01T00:00:00.000Z',
      }),
    );

    expect(result.map((item) => item.id)).toEqual(['first', 'target']);
    expect(result[1]).toMatchObject({
      title: 'Renamed target',
      isPinned: true,
    });
  });

  it('does not regress recency when an older updatedAt arrives', () => {
    const existing = [
      thread('first', { updatedAt: '2026-06-03T00:00:00.000Z' }),
      thread('target', { updatedAt: '2026-06-02T00:00:00.000Z' }),
    ];

    const result = upsertThreadHistoryItem(
      existing,
      thread('target', {
        title: 'Stale title update',
        updatedAt: '2026-06-01T00:00:00.000Z',
      }),
    );

    expect(result.map((item) => item.id)).toEqual(['first', 'target']);
    expect(result[1].title).toBe('Stale title update');
    expect(result[1].updatedAt).toBe('2026-06-02T00:00:00.000Z');
  });

  it('preserves the local history cap for new threads', () => {
    const existing = Array.from({ length: 50 }, (_, index) =>
      thread(`thread-${index}`),
    );

    const result = upsertThreadHistoryItem(existing, thread('new-thread'));

    expect(result).toHaveLength(50);
    expect(result[0].id).toBe('new-thread');
    expect(result.at(-1)?.id).toBe('thread-48');
  });
});
