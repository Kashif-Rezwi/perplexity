'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useHistoryStore } from '@/store/historyStore';
import type { ThreadDetailResponse } from '@/types/api.types';
import { getThread } from '@/lib/api';
import type { AskInputRef } from '@/features/home/components/AskInput';
import { useThreadAutoScroll } from './useThreadAutoScroll';
import { useThreadSources } from './useThreadSources';

export type ThreadTab = 'answer' | 'links';

export function useThreadPage(threadId: string) {
  const [activeTab, setActiveTab] = useState<ThreadTab>('answer');
  const [highlightedSourceNum, setHighlightedSourceNum] = useState<number | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const askInputRef = useRef<AskInputRef>(null);
  const lastTurnRef = useRef<HTMLDivElement>(null);
  const pendingTurnRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();

  const { data: thread, isPending, error } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => getThread(threadId),
    retry: 1,
  });

  const turnsCount = thread?.turns.length ?? 0;
  const latestTurnId = turnsCount > 0
    ? thread?.turns[turnsCount - 1]?.turnId ?? null
    : null;

  // Assemble grouped sources from the cache — no new fetches.
  const turnSourceGroups = useThreadSources(threadId, thread?.turns ?? []);

  useThreadHistoryRegistration(thread);
  useThreadAutoScroll({
    threadId,
    activeTab,
    turnsCount,
    latestTurnId,
    pendingQuestion,
    scrollContainerRef,
    lastTurnRef,
    pendingTurnRef,
  });

  function handleSelectSourceTurn() {
    setActiveTab('links');
  }

  function handleCitationClick(num: number) {
    setActiveTab('links');
    setHighlightedSourceNum(num);
  }

  function handleSubmitStart(q: string) {
    setPendingQuestion(q);
  }

  function handleSettled() {
    setPendingQuestion(null);
  }

  function retryThread() {
    void queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
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
    highlightedSourceNum,
    setHighlightedSourceNum,
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
    handleSettled,
    retryThread,
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
