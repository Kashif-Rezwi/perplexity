'use client';

import Link from 'next/link';
import { Globe, Image as ImageIcon, Compass, WifiOff } from 'lucide-react';
import { PerplexityLogo } from '@/components/ui/icons';
import { AskInput } from '@/features/home/components/AskInput';
import { ApiError } from '@/lib/api/client';
import { useThreadPage } from '../hooks/useThreadPage';
import { ThreadTurn } from './ThreadTurn';
import { LinksPanel } from './LinksPanel';
import { ThreadLoadingState, ThreadStatusState } from './ThreadStates';
import { ThreadTabButton } from './ThreadTabButton';

interface ThreadPageProps {
  threadId: string;
}

export function ThreadPage({ threadId }: ThreadPageProps) {
  const {
    thread,
    turnSourceGroups,
    isPending,
    error,
    activeTab,
    setActiveTab,
    highlightedSourceNum,
    setHighlightedSourceNum,
    pendingQuestion,
    askInputRef,
    lastTurnRef,
    pendingTurnRef,
    scrollContainerRef,
    handleSelectSourceTurn,
    handleCitationClick,
    handleSubmitStart,
    handleSettled,
    retryThread,
  } = useThreadPage(threadId);

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
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-accent)] text-[var(--color-accent-text)] hover:bg-[var(--color-accent-hover)] transition-all duration-[var(--transition-hover)] shadow-sm cursor-pointer no-underline"
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
              onClick={retryThread}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--color-accent)] text-[var(--color-accent-text)] hover:bg-[var(--color-accent-hover)] transition-all duration-[var(--transition-hover)] cursor-pointer"
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
      {/* Tab bar */}
      <div className="flex-none z-20 bg-[var(--color-bg)] border-b border-[var(--color-border-subtle)] w-full">
        <div className="content-width flex items-center pt-5 pb-0 font-sans">
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
              isActive={false}
              onClick={() => undefined}
              disabled
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full relative">
        {/* Answer Tab */}
        <div
          ref={scrollContainerRef}
          className={[
            'absolute inset-0 overflow-y-auto w-full',
            activeTab === 'answer' ? 'block' : 'hidden',
          ].join(' ')}
        >
          <div className="content-width flex flex-col pt-9 pb-[132px] md:pb-[118px]">
            <h1 className="text-[22px] font-medium text-[var(--color-text)] tracking-[-0.005em] mb-7 font-sans leading-tight">
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
                      onViewSources={handleSelectSourceTurn}
                      onSelectFollowUp={(q) => askInputRef.current?.submitQuestion(q, threadId)}
                      onCitationClick={(num) => handleCitationClick(num)}
                      onRetry={(q) => askInputRef.current?.submitQuestion(q, threadId)}
                    />
                  </div>
                );
              })}

              {pendingQuestion && (
                <div ref={pendingTurnRef} className="scroll-mt-8">
                  <ThreadTurn
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

        {/* Links Tab */}
        <div
          className={[
            'absolute inset-0 overflow-y-auto w-full',
            activeTab === 'links' ? 'block' : 'hidden',
          ].join(' ')}
        >
          <div className="content-width flex flex-col pt-9 pb-10">
            <div className="animate-in fade-in duration-300">
              <LinksPanel
                groups={turnSourceGroups}
                highlightedNumber={highlightedSourceNum}
                onClearHighlight={() => setHighlightedSourceNum(null)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating follow-up input */}
      {activeTab === 'answer' && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/95 to-transparent pt-12 pb-4 z-40 w-full pointer-events-none">
          <div className="pointer-events-auto">
            <AskInput
              ref={askInputRef}
              threadId={threadId}
              autoFocus={false}
              placeholder="Ask a follow-up"
              onSubmitStart={handleSubmitStart}
              onSettled={handleSettled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
