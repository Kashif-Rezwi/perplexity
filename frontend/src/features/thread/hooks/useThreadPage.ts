'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useHistoryStore } from '@/store/historyStore';
import type {
  SourceHighlightTarget,
  ThreadDetailResponse,
} from '@/types/api.types';
import { getThread } from '@/lib/api';
import { queryKeys } from '@/lib/api/queryKeys';
import type { AskInputRef } from '@/features/home/components/AskInput';
import { useAskSubmit } from '@/features/home/hooks/useAskSubmit';
import { useThreadAutoScroll } from './useThreadAutoScroll';
import { useThreadSources } from './useThreadSources';

export type ThreadTab = 'answer' | 'links';

export function useThreadPage(threadId: string) {
  const [activeTab, setActiveTab] = useState<ThreadTab>('answer');
  const [highlightedSourceTarget, setHighlightedSourceTarget] =
    useState<SourceHighlightTarget | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const askInputRef = useRef<AskInputRef>(null);
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const pendingTurnRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { retryFailedTurn } = useAskSubmit({
    threadId,
    onSubmitStart: handleSubmitStart,
    onStreamStart: handleStreamStart,
    onSettled: handleSettled,
  });

  const { data: thread, isPending, error } = useQuery({
    queryKey: queryKeys.thread(threadId),
    queryFn: () => getThread(threadId),
    retry: 1,
  });

  const turnsCount = thread?.turns.length ?? 0;
  const latestTurnId = turnsCount > 0
    ? thread?.turns[turnsCount - 1]?.turnId ?? null
    : null;
  const latestTurnStatus = turnsCount > 0
    ? thread?.turns[turnsCount - 1]?.status ?? null
    : null;

  // Assemble grouped sources from thread fallback data and fetch canonical lists only when needed.
  const turnSourceGroups = useThreadSources(
    threadId,
    thread?.turns ?? [],
    activeTab === 'links',
    highlightedSourceTarget,
  );

  useThreadHistoryRegistration(thread);
  useThreadAutoScroll({
    threadId,
    activeTab,
    turnsCount,
    latestTurnId,
    latestTurnStatus,
    pendingQuestion,
    scrollContainerRef,
    lastTurnRef,
    pendingTurnRef,
  });

  function handleSelectSourceTurn() {
    setActiveTab('links');
  }

  function handleCitationClick(turnId: string, citationNumber: number) {
    setActiveTab('links');
    setHighlightedSourceTarget({ turnId, citationNumber });
  }

  function handleSubmitStart(q: string) {
    setPendingQuestion(q);
  }

  function handleStreamStart() {
    setPendingQuestion(null);
  }

  function handleSettled() {
    setPendingQuestion(null);
  }

  function retryThread() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.thread(threadId) });
  }

  function retryTurn(turnId: string, question: string) {
    retryFailedTurn(turnId, question, threadId);
  }

  return {
    // Data
    thread,
    turnSourceGroups,
    // Status
    isPending,
    error,
    // UI state
    activeTab,
    setActiveTab,
    highlightedSourceTarget,
    setHighlightedSourceTarget,
    pendingQuestion,
    // Refs
    askInputRef,
    lastTurnRef,
    pendingTurnRef,
    scrollContainerRef,
    // Handlers
    handleSelectSourceTurn,
    handleCitationClick,
    handleSubmitStart,
    handleStreamStart,
    handleSettled,
    retryThread,
    retryTurn,
  };
}

function useThreadHistoryRegistration(thread?: ThreadDetailResponse) {
  const addThread = useHistoryStore((state) => state.addThread);

  useEffect(() => {
    if (!thread) return;

    addThread({
      id: thread.threadId,
      title: thread.title,
      mode: thread.mode,
      updatedAt: thread.updatedAt,
    });
  }, [thread, addThread]);
}
