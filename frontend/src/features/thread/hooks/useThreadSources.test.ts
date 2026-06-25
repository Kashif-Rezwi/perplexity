import { describe, expect, it } from 'vitest';
import {
  hasLoadingSourceQuery,
  shouldFetchSourcesForTurn,
} from './useThreadSources';

describe('shouldFetchSourcesForTurn', () => {
  it('waits to fetch while the answer tab is active and no citation is highlighted', () => {
    expect(shouldFetchSourcesForTurn('thread-1', 'turn-1', false, null)).toBe(false);
  });

  it('fetches all turn sources when links are visible', () => {
    expect(shouldFetchSourcesForTurn('thread-1', 'turn-1', true, null)).toBe(true);
  });

  it('fetches the highlighted turn source list even before links finish rendering', () => {
    expect(
      shouldFetchSourcesForTurn('thread-1', 'turn-1', false, {
        turnId: 'turn-1',
        citationNumber: 2,
      }),
    ).toBe(true);
  });

  it('does not fetch without a thread id', () => {
    expect(shouldFetchSourcesForTurn('', 'turn-1', true, null)).toBe(false);
  });
});

describe('hasLoadingSourceQuery', () => {
  it('returns true when an enabled source query is fetching', () => {
    expect(
      hasLoadingSourceQuery(
        [
          { isPending: false, isFetching: false },
          { isPending: false, isFetching: true },
        ],
        [true, true],
      ),
    ).toBe(true);
  });

  it('ignores disabled source queries even when they are pending', () => {
    expect(
      hasLoadingSourceQuery(
        [
          { isPending: true, isFetching: false },
          { isPending: false, isFetching: false },
        ],
        [false, true],
      ),
    ).toBe(false);
  });
});
