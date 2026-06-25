import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { ApiTurnStatus } from '@/types/api.types';

const SCROLL_TOP_MARGIN_PX = 32;
const INITIAL_SCROLL_DELAY_MS = 200;
const UPDATE_SCROLL_DELAY_MS = 100;
const STREAMING_ANCHOR_INTERVAL_MS = 80;
const SCROLL_TOLERANCE_PX = 1;
const SCROLL_PAUSE_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
  'Spacebar',
]);

type UseThreadAutoScrollInput = {
  threadId: string;
  activeTab: 'answer' | 'links';
  turnsCount: number;
  latestTurnId: string | null;
  latestTurnStatus: ApiTurnStatus | null;
  pendingQuestion: string | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  lastTurnRef: RefObject<HTMLDivElement | null>;
  pendingTurnRef: RefObject<HTMLDivElement | null>;
};

type ScrollAnchorGeometry = {
  targetOffsetTop: number;
  containerScrollHeight: number;
  containerClientHeight: number;
  topMarginPx?: number;
};

export function getAnchoredScrollTop({
  targetOffsetTop,
  containerScrollHeight,
  containerClientHeight,
  topMarginPx = SCROLL_TOP_MARGIN_PX,
}: ScrollAnchorGeometry): number {
  const maxScrollTop = Math.max(0, containerScrollHeight - containerClientHeight);
  const targetScrollTop = Math.max(0, targetOffsetTop - topMarginPx);

  return Math.min(targetScrollTop, maxScrollTop);
}

export function shouldPauseAutoScrollForKey(key: string): boolean {
  return SCROLL_PAUSE_KEYS.has(key);
}

function scrollElementToTop(
  container: HTMLDivElement,
  target: HTMLDivElement,
  behavior: ScrollBehavior = 'smooth',
) {
  const top = getAnchoredScrollTop({
    targetOffsetTop: target.offsetTop,
    containerScrollHeight: container.scrollHeight,
    containerClientHeight: container.clientHeight,
  });

  if (Math.abs(container.scrollTop - top) <= SCROLL_TOLERANCE_PX) {
    return;
  }

  container.scrollTo({
    top,
    behavior,
  });
}

function scheduleScrollToTop(
  getContainer: () => HTMLDivElement | null,
  getTarget: () => HTMLDivElement | null,
  delayMs: number,
  onScrolled?: () => void,
  behavior: ScrollBehavior = 'smooth',
  shouldAutoScroll: () => boolean = () => true,
) {
  let firstFrame = 0;
  let secondFrame = 0;

  const timer = window.setTimeout(() => {
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (!shouldAutoScroll()) return;

        const container = getContainer();
        const target = getTarget();

        if (!container || !target) return;

        scrollElementToTop(container, target, behavior);
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

function maintainAnchorWhileActive(
  getContainer: () => HTMLDivElement | null,
  getTarget: () => HTMLDivElement | null,
  shouldAutoScroll: () => boolean = () => true,
) {
  let animationFrame = 0;
  let resizeObserver: ResizeObserver | null = null;

  const scrollToAnchor = () => {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = window.requestAnimationFrame(() => {
      if (!shouldAutoScroll()) return;

      const container = getContainer();
      const target = getTarget();

      if (!container || !target) return;

      scrollElementToTop(container, target, 'auto');
    });
  };

  const interval = window.setInterval(
    scrollToAnchor,
    STREAMING_ANCHOR_INTERVAL_MS,
  );
  const firstTimer = window.setTimeout(scrollToAnchor, 0);
  const settledTimer = window.setTimeout(
    scrollToAnchor,
    UPDATE_SCROLL_DELAY_MS,
  );

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(scrollToAnchor);

    const container = getContainer();
    const target = getTarget();

    if (container) {
      resizeObserver.observe(container);
    }

    if (target) {
      resizeObserver.observe(target);
    }
  }

  return () => {
    window.clearInterval(interval);
    window.clearTimeout(firstTimer);
    window.clearTimeout(settledTimer);
    window.cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
  };
}

export function useThreadAutoScroll({
  threadId,
  activeTab,
  turnsCount,
  latestTurnId,
  latestTurnStatus,
  pendingQuestion,
  scrollContainerRef,
  lastTurnRef,
  pendingTurnRef,
}: UseThreadAutoScrollInput) {
  const isAutoScrollPausedRef = useRef(false);
  const previousPendingQuestionRef = useRef<string | null>(null);
  const lastScrolledRef = useRef<{
    threadId: string | null;
    turnsCount: number;
    latestTurnId: string | null;
    latestTurnStatus: ApiTurnStatus | null;
  }>({
    threadId: null,
    turnsCount: 0,
    latestTurnId: null,
    latestTurnStatus: null,
  });

  useEffect(() => {
    isAutoScrollPausedRef.current = false;
    previousPendingQuestionRef.current = null;
  }, [threadId]);

  useEffect(() => {
    if (
      pendingQuestion &&
      previousPendingQuestionRef.current !== pendingQuestion
    ) {
      isAutoScrollPausedRef.current = false;
    }

    previousPendingQuestionRef.current = pendingQuestion;
  }, [pendingQuestion]);

  useEffect(() => {
    if (activeTab !== 'answer') return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const pauseAutoScroll = () => {
      isAutoScrollPausedRef.current = true;
    };
    const pauseAutoScrollForKey = (event: KeyboardEvent) => {
      if (shouldPauseAutoScrollForKey(event.key)) {
        pauseAutoScroll();
      }
    };

    container.addEventListener('wheel', pauseAutoScroll, { passive: true });
    container.addEventListener('touchstart', pauseAutoScroll, { passive: true });
    container.addEventListener('touchmove', pauseAutoScroll, { passive: true });
    container.addEventListener('pointerdown', pauseAutoScroll, {
      passive: true,
    });
    window.addEventListener('keydown', pauseAutoScrollForKey, {
      capture: true,
    });

    return () => {
      container.removeEventListener('wheel', pauseAutoScroll);
      container.removeEventListener('touchstart', pauseAutoScroll);
      container.removeEventListener('touchmove', pauseAutoScroll);
      container.removeEventListener('pointerdown', pauseAutoScroll);
      window.removeEventListener('keydown', pauseAutoScrollForKey, {
        capture: true,
      });
    };
  }, [activeTab, scrollContainerRef]);

  useEffect(() => {
    if (!latestTurnId || activeTab !== 'answer') return;

    const alreadyScrolled =
      lastScrolledRef.current.threadId === threadId &&
      lastScrolledRef.current.turnsCount === turnsCount &&
      lastScrolledRef.current.latestTurnId === latestTurnId &&
      lastScrolledRef.current.latestTurnStatus === latestTurnStatus;

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
        lastScrolledRef.current = {
          threadId,
          turnsCount,
          latestTurnId,
          latestTurnStatus,
        };
      },
      'smooth',
      () => !isAutoScrollPausedRef.current,
    );
  }, [
    activeTab,
    lastTurnRef,
    latestTurnId,
    latestTurnStatus,
    scrollContainerRef,
    threadId,
    turnsCount,
  ]);

  useEffect(() => {
    if (
      activeTab !== 'answer' ||
      !latestTurnId ||
      latestTurnStatus !== 'pending'
    ) {
      return;
    }

    return maintainAnchorWhileActive(
      () => scrollContainerRef.current,
      () => lastTurnRef.current,
      () => !isAutoScrollPausedRef.current,
    );
  }, [
    activeTab,
    lastTurnRef,
    latestTurnId,
    latestTurnStatus,
    scrollContainerRef,
  ]);

  useEffect(() => {
    if (!pendingQuestion || activeTab !== 'answer') return;

    const cleanupAnchor = maintainAnchorWhileActive(
      () => scrollContainerRef.current,
      () => pendingTurnRef.current,
      () => !isAutoScrollPausedRef.current,
    );
    const cleanupImmediate = scheduleScrollToTop(
      () => scrollContainerRef.current,
      () => pendingTurnRef.current,
      0,
      undefined,
      'smooth',
      () => !isAutoScrollPausedRef.current,
    );
    const cleanupSettled = scheduleScrollToTop(
      () => scrollContainerRef.current,
      () => pendingTurnRef.current,
      UPDATE_SCROLL_DELAY_MS,
      undefined,
      'smooth',
      () => !isAutoScrollPausedRef.current,
    );

    return () => {
      cleanupAnchor();
      cleanupImmediate();
      cleanupSettled();
    };
  }, [activeTab, pendingQuestion, pendingTurnRef, scrollContainerRef]);
}
