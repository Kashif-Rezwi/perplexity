import { describe, expect, it } from 'vitest';
import { shouldFetchSourcesForTurn } from './useThreadSources';

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
