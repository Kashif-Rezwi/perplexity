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

function scheduleScrollToTop(
  getContainer: () => HTMLDivElement | null,
  getTarget: () => HTMLDivElement | null,
  delayMs: number,
  onScrolled?: () => void,
) {
  let firstFrame = 0;
  let secondFrame = 0;

  const timer = window.setTimeout(() => {
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const container = getContainer();
        const target = getTarget();

        if (!container || !target) return;

        scrollElementToTop(container, target);
        onScrolled?.();
      });
    });
  }, delayMs);

  return () => {
    window.clearTimeout(timer);
    window.cancelAnimationFrame(firstFrame);
    window.cancelAnimationFrame(secondFrame);
  };
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

    return scheduleScrollToTop(
      () => scrollContainerRef.current,
      () => {
        const hashTurnId = isInitialLoad
          ? window.location.hash.replace('#turn-', '')
          : '';
        const hashTarget = hashTurnId
          ? document.getElementById(`turn-${hashTurnId}`)
          : null;

        return hashTarget instanceof HTMLDivElement
          ? hashTarget
          : lastTurnRef.current;
      },
      delay,
      () => {
        lastScrolledRef.current = { threadId, turnsCount, latestTurnId };
      },
    );
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

    const cleanupImmediate = scheduleScrollToTop(
      () => scrollContainerRef.current,
      () => pendingTurnRef.current,
      0,
    );
    const cleanupSettled = scheduleScrollToTop(
      () => scrollContainerRef.current,
      () => pendingTurnRef.current,
      UPDATE_SCROLL_DELAY_MS,
    );

    return () => {
      cleanupImmediate();
      cleanupSettled();
    };
  }, [activeTab, pendingQuestion, pendingTurnRef, scrollContainerRef]);
}
