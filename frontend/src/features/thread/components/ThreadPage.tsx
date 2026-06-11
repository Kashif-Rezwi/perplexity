'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getThread } from '@/lib/api/threads.api';
import { Globe, Image as ImageIcon, Lock, Compass, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { PerplexityLogo } from '@/components/ui/icons';
import { ThreadTurn } from './ThreadTurn';
import { LinksPanel } from './LinksPanel';
import { AskInput, AskInputRef } from '@/features/home/components/AskInput';
import { useHistoryStore } from '@/store/historyStore';
import { ApiError } from '@/lib/api/client';

interface ThreadPageProps {
  threadId: string;
}

interface ThreadStatusStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionButton: React.ReactNode;
}

function ThreadStatusState({ icon, title, description, actionButton }: ThreadStatusStateProps) {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-24 gap-6 px-4 font-sans select-none animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-2 shadow-sm">
        {icon}
      </div>
      <div className="text-center max-w-sm font-sans">
        <h2 className="text-[20px] font-semibold text-[var(--color-text)] mb-2 tracking-tight">
          {title}
        </h2>
        <p className="text-[var(--color-text-muted)] text-[13.5px] leading-relaxed">
          {description}
        </p>
      </div>
      {actionButton}
    </div>
  );
}

export function ThreadPage({ threadId }: ThreadPageProps) {
  const [activeTab, setActiveTab] = useState<'answer' | 'links' | 'images'>('answer');
  const [highlightedSourceNum, setHighlightedSourceNum] = useState<number | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const askInputRef = useRef<AskInputRef>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const addThread = useHistoryStore((state) => state.addThread);
  const queryClient = useQueryClient();

  const { data: thread, isPending, error } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => getThread(threadId),
    retry: 1,
  });

  useEffect(() => {
    if (thread) {
      addThread({
        id: thread.threadId,
        title: thread.title,
      });
    }
  }, [thread, addThread]);

  useEffect(() => {
    if (!pendingQuestion && !thread?.turns.length) return;
    const frame = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingQuestion, thread?.turns.length]);

  if (isPending) {
    return (
      <div className="flex flex-col w-full h-full relative overflow-hidden bg-[var(--color-bg)] font-sans">
        {/* Fake Header */}
        <div className="flex-none z-20 bg-[var(--color-bg)] border-b border-[var(--color-border)] w-full">
          <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-2 w-full max-w-3xl mx-auto">
            <div className="flex items-center gap-6">
              <div className="w-16 h-4 bg-[var(--color-surface)] rounded animate-pulse" />
              <div className="w-16 h-4 bg-[var(--color-surface)] rounded animate-pulse" />
              <div className="w-16 h-4 bg-[var(--color-surface)] rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="w-full max-w-3xl mx-auto flex flex-col px-4 md:px-6 pt-8 pb-20">
            {/* Title Skeleton */}
            <div className="w-3/4 h-8 bg-[var(--color-surface)] rounded-md animate-pulse mb-8" />

            {/* In-flight Turn Skeleton */}
            <div className="flex flex-col gap-6">
              {/* Question line */}
              <div className="w-1/3 h-5 bg-[var(--color-surface)] rounded-md animate-pulse mb-4" />

              {/* Text lines */}
              <div className="flex flex-col gap-3">
                <div className="w-full h-3 bg-[var(--color-surface)] rounded animate-pulse" />
                <div className="w-11/12 h-3 bg-[var(--color-surface)] rounded animate-pulse" />
                <div className="w-5/6 h-3 bg-[var(--color-surface)] rounded animate-pulse" />
                <div className="w-2/3 h-3 bg-[var(--color-surface)] rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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

  const renderTabButton = (
    tabId: 'answer' | 'links' | 'images',
    label: string,
    icon: React.ReactNode
  ) => {
    const isActive = activeTab === tabId;
    return (
      <button
        onClick={() => setActiveTab(tabId)}
        className={[
          'flex items-center gap-2 pb-2 px-1 text-[15px] font-medium transition-colors relative cursor-pointer',
          isActive
            ? 'text-[var(--color-text)] font-semibold'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
        ].join(' ')}
      >
        {icon}
        {label}
        {isActive && (
          <div className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-[var(--color-accent)] rounded-t-full" />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-[var(--color-bg)]">
      <div className="flex-none z-20 bg-[var(--color-bg)] border-b border-[var(--color-border)] w-full">
        <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-2 w-full max-w-3xl mx-auto font-sans">
          <div className="flex items-center gap-6">
            {renderTabButton('answer', 'Answer', <PerplexityLogo size={16} className={activeTab === 'answer' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'} />)}
            {renderTabButton('links', 'Links', <Globe size={16} />)}
            {renderTabButton('images', 'Images', <ImageIcon size={16} />)}
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[var(--color-text)] bg-transparent border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] rounded-md transition-colors cursor-pointer">
              <Lock size={13} />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <div
          className="w-full max-w-3xl mx-auto flex flex-col px-4 md:px-6 pt-6 pb-[380px] md:pb-[340px]"
        >
          {activeTab === 'answer' && (
            <>
              <h1 className="text-[28px] font-bold text-[var(--color-text)] tracking-tight mb-8 font-sans leading-tight">
                {thread.title}
              </h1>

              <div className="flex flex-col gap-8">
                {thread.turns.map((turn, index) => (
                  <ThreadTurn
                    key={turn.turnId}
                    turn={turn}
                    isLast={index === thread.turns.length - 1 && !pendingQuestion}
                    onViewSources={() => setActiveTab('links')}
                    onSelectFollowUp={(q) => askInputRef.current?.submitQuestion(q, threadId)}
                    onCitationClick={(num) => {
                      setActiveTab('links');
                      setHighlightedSourceNum(num);
                    }}
                    onRetry={(q) => askInputRef.current?.submitQuestion(q, threadId)}
                  />
                ))}

                {pendingQuestion && (
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
                      sources: [],
                      citations: [],
                      createdAt: new Date().toISOString(),
                      completedAt: null,
                    }}
                    isLast={false}
                  />
                )}

                <div
                  ref={bottomRef}
                  aria-hidden="true"
                  className="h-px w-full"
                  style={{ scrollMarginBottom: 300 }}
                />
              </div>
            </>
          )}

          {activeTab === 'links' && (
            <div className="animate-in fade-in duration-300">
              <LinksPanel
                sources={thread.turns[thread.turns.length - 1]?.sources || []}
                searchQuery={thread.turns[thread.turns.length - 1]?.searchQuery}
                highlightedNumber={highlightedSourceNum}
                onClearHighlight={() => setHighlightedSourceNum(null)}
              />
            </div>
          )}

          {activeTab === 'images' && (
            <div className="animate-in fade-in duration-300">
              <div className="text-[var(--color-text-muted)] text-sm py-4">No images available for this thread.</div>
            </div>
          )}
        </div>
      </div>

      {thread && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/90 to-transparent pt-8 pb-6 z-10 w-full pointer-events-none">
          <div className="pointer-events-auto">
            <AskInput
              ref={askInputRef}
              threadId={threadId}
              autoFocus={false}
              onSubmitStart={(q) => setPendingQuestion(q)}
              onSettled={() => setPendingQuestion(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
