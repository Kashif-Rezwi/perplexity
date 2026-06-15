import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const SCROLL_TOP_MARGIN_PX = 32;
const INITIAL_SCROLL_DELAY_MS = 200;
const UPDATE_SCROLL_DELAY_MS = 100;

type UseThreadAutoScrollInput = {
  threadId: string;
  activeTab: 'answer' | 'links';
  turnsCount: number;
  latestTurnId: string | null;
  pendingQuestion: string | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  lastTurnRef: RefObject<HTMLDivElement | null>;
  pendingTurnRef: RefObject<HTMLDivElement | null>;
};

function scrollElementToTop(
  container: HTMLDivElement,
  target: HTMLDivElement,
) {
  container.scrollTo({
    top: Math.max(0, target.offsetTop - SCROLL_TOP_MARGIN_PX),
    behavior: 'smooth',
  });
}

export function useThreadAutoScroll({
  threadId,
  activeTab,
  turnsCount,
  latestTurnId,
  pendingQuestion,
  scrollContainerRef,
  lastTurnRef,
  pendingTurnRef,
}: UseThreadAutoScrollInput) {
  const lastScrolledRef = useRef<{
    threadId: string | null;
    turnsCount: number;
    latestTurnId: string | null;
  }>({
    threadId: null,
    turnsCount: 0,
    latestTurnId: null,
  });

  useEffect(() => {
    if (!latestTurnId || activeTab !== 'answer') return;

    const alreadyScrolled =
      lastScrolledRef.current.threadId === threadId &&
      lastScrolledRef.current.turnsCount === turnsCount &&
      lastScrolledRef.current.latestTurnId === latestTurnId;

    if (alreadyScrolled) return;

    const isInitialLoad = lastScrolledRef.current.threadId !== threadId;
    const delay = isInitialLoad
      ? INITIAL_SCROLL_DELAY_MS
      : UPDATE_SCROLL_DELAY_MS;

    const timer = setTimeout(() => {
      if (scrollContainerRef.current && lastTurnRef.current) {
        scrollElementToTop(scrollContainerRef.current, lastTurnRef.current);
        lastScrolledRef.current = { threadId, turnsCount, latestTurnId };
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [
    activeTab,
    lastTurnRef,
    latestTurnId,
    scrollContainerRef,
    threadId,
    turnsCount,
  ]);

  useEffect(() => {
    if (!pendingQuestion || activeTab !== 'answer') return;

    const timer = setTimeout(() => {
      if (scrollContainerRef.current && pendingTurnRef.current) {
        scrollElementToTop(scrollContainerRef.current, pendingTurnRef.current);
      }
    }, UPDATE_SCROLL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [activeTab, pendingQuestion, pendingTurnRef, scrollContainerRef]);
}
