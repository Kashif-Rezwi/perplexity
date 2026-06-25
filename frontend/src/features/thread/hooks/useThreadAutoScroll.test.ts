import { describe, expect, it } from 'vitest';
import {
  getAnchoredScrollTop,
  shouldPauseAutoScrollForKey,
} from './useThreadAutoScroll';

describe('getAnchoredScrollTop', () => {
  it('places the target below the top margin when there is enough scroll range', () => {
    expect(
      getAnchoredScrollTop({
        targetOffsetTop: 640,
        containerScrollHeight: 1800,
        containerClientHeight: 800,
        topMarginPx: 32,
      }),
    ).toBe(608);
  });

  it('clamps to the available scroll range when the content is still too short', () => {
    expect(
      getAnchoredScrollTop({
        targetOffsetTop: 640,
        containerScrollHeight: 1000,
        containerClientHeight: 800,
        topMarginPx: 32,
      }),
    ).toBe(200);
  });

  it('never returns a negative scroll position for targets near the top', () => {
    expect(
      getAnchoredScrollTop({
        targetOffsetTop: 12,
        containerScrollHeight: 1000,
        containerClientHeight: 800,
        topMarginPx: 32,
      }),
    ).toBe(0);
  });
});

describe('shouldPauseAutoScrollForKey', () => {
  it('pauses auto-scroll for keyboard scroll navigation keys', () => {
    expect(shouldPauseAutoScrollForKey('ArrowDown')).toBe(true);
    expect(shouldPauseAutoScrollForKey('ArrowUp')).toBe(true);
    expect(shouldPauseAutoScrollForKey('PageDown')).toBe(true);
    expect(shouldPauseAutoScrollForKey('PageUp')).toBe(true);
    expect(shouldPauseAutoScrollForKey('Home')).toBe(true);
    expect(shouldPauseAutoScrollForKey('End')).toBe(true);
    expect(shouldPauseAutoScrollForKey(' ')).toBe(true);
  });

  it('does not pause auto-scroll for ordinary typing keys', () => {
    expect(shouldPauseAutoScrollForKey('a')).toBe(false);
    expect(shouldPauseAutoScrollForKey('Enter')).toBe(false);
    expect(shouldPauseAutoScrollForKey('Escape')).toBe(false);
  });
});
