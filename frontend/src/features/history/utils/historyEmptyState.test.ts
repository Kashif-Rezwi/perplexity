import { describe, expect, it } from 'vitest';
import { getHistoryEmptyState } from './historyEmptyState';

describe('getHistoryEmptyState', () => {
  it('returns the empty history message when no search or filter is active', () => {
    expect(
      getHistoryEmptyState({ searchQuery: '', typeFilter: 'all' }).message,
    ).toBe('No chats yet.');
  });

  it('prioritizes search empty state copy', () => {
    expect(
      getHistoryEmptyState({
        searchQuery: 'postgres',
        typeFilter: 'deep-research',
      }).message,
    ).toBe('No chats match this search.');
  });

  it('returns filter empty state copy when a non-search filter is active', () => {
    expect(
      getHistoryEmptyState({ searchQuery: '   ', typeFilter: 'web' }).message,
    ).toBe('No chats match this filter.');
  });
});
