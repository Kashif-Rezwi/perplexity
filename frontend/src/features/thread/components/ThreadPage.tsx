'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getThread } from '@/lib/api/threads.api';
import { getSources } from '@/lib/api/sources.api';
import { Globe, Image as ImageIcon, Compass, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { PerplexityLogo } from '@/components/ui/icons';
import { ThreadTurn } from './ThreadTurn';
import { LinksPanel } from './LinksPanel';
import { AskInput, AskInputRef } from '@/features/home/components/AskInput';
import { ApiError } from '@/lib/api/client';
import { useThreadAutoScroll } from '../hooks/useThreadAutoScroll';
import { useThreadHistoryRegistration } from '../hooks/useThreadHistoryRegistration';
import { useThreadSourceSelection } from '../hooks/useThreadSourceSelection';
import { ThreadLoadingState, ThreadStatusState } from './ThreadStates';
import { ThreadTabButton } from './ThreadTabButton';

interface ThreadPageProps {
  threadId: string;
}

export function ThreadPage({ threadId }: ThreadPageProps) {
  const [activeTab, setActiveTab] = useState<'answer' | 'links' | 'images'>('answer');
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
  const {
    selectedTurn: selectedTurnForLinks,
    selectSourceTurn,
    clearSourceTurnSelection,
  } = useThreadSourceSelection(threadId, thread?.turns ?? []);
  const selectedTurnIdForLinks = selectedTurnForLinks?.turnId;
  const {
    data: selectedSources,
    isFetching: isFetchingSources,
    error: sourcesError,
  } = useQuery({
    queryKey: ['sources', selectedTurnIdForLinks],
    queryFn: () => getSources({ turnId: selectedTurnIdForLinks }),
    enabled: activeTab === 'links' && Boolean(selectedTurnIdForLinks),
    retry: 1,
  });
  const linksSources = selectedSources?.items ?? selectedTurnForLinks?.sources ?? [];

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

  if (isPending) {
    return <ThreadLoadingState />;
  }

  if (error || !thread) {
    const isNotFound = error instanceof ApiError && error.status === 404;

    if (isNotFound || (!thread && !error)) {
      return (
        <ThreadStatusState
          icon={<Compass size={28} className="stroke-[1.5]" />}
          title="Thread not found"
          description="This thread doesn't exist, has been deleted, or you don't have permission to view it."
          actionButton={
            <Link
              href="/"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-all duration-[var(--transition-hover)] shadow-sm cursor-pointer no-underline"
            >
              Go Home
            </Link>
          }
        />
      );
    }

    return (
      <ThreadStatusState
        icon={<WifiOff size={28} className="stroke-[1.5]" />}
        title="Connection failed"
        description="We couldn't connect to the server. Please check your internet connection or try again."
        actionButton={
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer no-underline"
            >
              Go Home
            </Link>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['thread', threadId] })}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-all duration-[var(--transition-hover)] cursor-pointer"
            >
              Try again
            </button>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-[var(--color-bg)]">
      <div className="flex-none z-20 bg-[var(--color-bg)] border-b border-[var(--color-border)] w-full">
        <div className="flex items-center px-4 md:px-6 pt-4 pb-2 w-full max-w-3xl mx-auto font-sans">
          <div className="flex items-center gap-6">
            <ThreadTabButton
              label="Answer"
              icon={<PerplexityLogo size={16} className={activeTab === 'answer' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'} />}
              isActive={activeTab === 'answer'}
              onClick={() => setActiveTab('answer')}
            />
            <ThreadTabButton
              label="Links"
              icon={<Globe size={16} />}
              isActive={activeTab === 'links'}
              onClick={() => setActiveTab('links')}
            />
            <ThreadTabButton
              label="Images"
              icon={<ImageIcon size={16} />}
              isActive={activeTab === 'images'}
              onClick={() => setActiveTab('images')}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full relative">
        {/* Answer Tab Scroll Container */}
        <div
          ref={scrollContainerRef}
          className={[
            'absolute inset-0 overflow-y-auto w-full',
            activeTab === 'answer' ? 'block' : 'hidden',
          ].join(' ')}
        >
          <div className="w-full max-w-3xl mx-auto flex flex-col px-4 md:px-6 pt-10 pb-[180px] md:pb-[160px]">
            <h1 className="text-[28px] font-bold text-[var(--color-text)] tracking-tight mb-8 font-sans leading-tight">
              {thread.title}
            </h1>

            <div className="flex flex-col gap-8">
              {thread.turns.map((turn, index) => {
                const isLastTurn = index === thread.turns.length - 1;
                return (
                  <div
                    key={turn.turnId}
                    ref={isLastTurn ? lastTurnRef : null}
                    className="scroll-mt-8"
                  >
                    <ThreadTurn
                      turn={turn}
                      isLast={isLastTurn && !pendingQuestion}
                      onViewSources={() => {
                        selectSourceTurn(turn.turnId);
                        setActiveTab('links');
                      }}
                      onSelectFollowUp={(q) => askInputRef.current?.submitQuestion(q, threadId)}
                      onCitationClick={(num) => {
                        selectSourceTurn(turn.turnId);
                        setActiveTab('links');
                        setHighlightedSourceNum(num);
                      }}
                      onRetry={(q) => askInputRef.current?.submitQuestion(q, threadId)}
                    />
                  </div>
                );
              })}

              {pendingQuestion && (
                <div ref={pendingTurnRef} className="scroll-mt-8">
                  <ThreadTurn
                    key="pending-turn"
                    turn={{
                      turnId: 'pending',
                      question: pendingQuestion,
                      searchQuery: '',
                      answerMarkdown: null,
                      suggestedFollowUpQuestions: [],
                      status: 'pending',
                      errorMessage: null,
                      sourceCount: 0,
                      citationCount: 0,
                      sources: [],
                      citations: [],
                      createdAt: new Date().toISOString(),
                      completedAt: null,
                    }}
                    isLast={false}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Links Tab Scroll Container */}
        <div
          className={[
            'absolute inset-0 overflow-y-auto w-full',
            activeTab === 'links' ? 'block' : 'hidden',
          ].join(' ')}
        >
          <div className="w-full max-w-3xl mx-auto flex flex-col px-4 md:px-6 pt-10 pb-10">
            <div className="animate-in fade-in duration-300">
              <LinksPanel
                sources={linksSources}
                searchQuery={selectedTurnForLinks?.searchQuery}
                isLoading={isFetchingSources && linksSources.length === 0}
                errorMessage={sourcesError ? 'Unable to load links for this answer.' : null}
                highlightedNumber={highlightedSourceNum}
                onClearHighlight={() => setHighlightedSourceNum(null)}
              />
            </div>
          </div>
        </div>

        {/* Images Tab Scroll Container */}
        <div
          className={[
            'absolute inset-0 overflow-y-auto w-full',
            activeTab === 'images' ? 'block' : 'hidden',
          ].join(' ')}
        >
          <div className="w-full max-w-3xl mx-auto flex flex-col px-4 md:px-6 pt-10 pb-10">
            <div className="animate-in fade-in duration-300">
              <div className="text-[var(--color-text-muted)] text-sm py-4">No images available for this thread.</div>
            </div>
          </div>
        </div>
      </div>

      {thread && activeTab === 'answer' && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/95 to-transparent pt-16 pb-6 z-40 w-full pointer-events-none">
          <div className="pointer-events-auto">
            <AskInput
              ref={askInputRef}
              threadId={threadId}
              autoFocus={false}
              onSubmitStart={(q) => {
                clearSourceTurnSelection();
                setPendingQuestion(q);
              }}
              onSettled={() => setPendingQuestion(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
