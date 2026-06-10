'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getThread } from '@/lib/api/threads.api';
import { Loader2, Globe, Image as ImageIcon, Lock } from 'lucide-react';
import { PerplexityLogo } from '@/components/ui/icons';
import { ThreadTurn } from './ThreadTurn';
import { LinksPanel } from './LinksPanel';
import { AskInput, AskInputRef } from '@/features/home/components/AskInput';
import { useHistoryStore } from '@/store/historyStore';

/** Reserve space above the fixed AskInput so follow-ups are not hidden underneath it. */
const ASK_INPUT_OVERLAY_HEIGHT_PX = 240;

interface ThreadPageProps {
  threadId: string;
}

export function ThreadPage({ threadId }: ThreadPageProps) {
  const [activeTab, setActiveTab] = useState<'answer' | 'links' | 'images'>('answer');
  const [highlightedSourceNum, setHighlightedSourceNum] = useState<number | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const askInputRef = useRef<AskInputRef>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const addThread = useHistoryStore((state) => state.addThread);

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

  const lastTurn = thread?.turns[thread.turns.length - 1];
  const lastTurnHasFollowUps =
    !pendingQuestion &&
    lastTurn?.status === 'completed' &&
    (lastTurn.suggestedFollowUpQuestions?.length ?? 0) > 0;

  const contentBottomPadding = lastTurnHasFollowUps
    ? ASK_INPUT_OVERLAY_HEIGHT_PX + 120 + lastTurn!.suggestedFollowUpQuestions.length * 52
    : ASK_INPUT_OVERLAY_HEIGHT_PX + 48;

  useEffect(() => {
    if (!pendingQuestion && !thread?.turns.length) return;
    const frame = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingQuestion, thread?.turns.length, lastTurnHasFollowUps]);

  if (isPending) {
    return (
      <div className="w-full flex justify-center py-12">
        <Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="w-full text-center py-12">
        <h2 className="text-[20px] font-semibold text-[var(--color-text)] mb-2">
          Thread not found
        </h2>
        <p className="text-[var(--color-text-muted)] text-sm">
          The thread you&apos;re looking for doesn&apos;t exist or an error occurred.
        </p>
      </div>
    );
  }

  const hasCompletedAnswer = thread.turns.some((turn) => turn.status === 'completed');

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-[var(--color-bg)]">
      <div className="flex-none z-20 bg-[var(--color-bg)] border-b border-[var(--color-border)] w-full">
        <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-2 w-full max-w-3xl mx-auto font-sans">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('answer')}
              className={[
                'flex items-center gap-2 pb-2 px-1 text-[15px] font-medium transition-colors relative cursor-pointer',
                activeTab === 'answer' ? 'text-[var(--color-text)] font-semibold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              <PerplexityLogo size={16} className={activeTab === 'answer' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'} />
              Answer
              {activeTab === 'answer' && (
                <div className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-[var(--color-accent)] rounded-t-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('links')}
              className={[
                'flex items-center gap-2 pb-2 px-1 text-[15px] font-medium transition-colors relative cursor-pointer',
                activeTab === 'links' ? 'text-[var(--color-text)] font-semibold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              <Globe size={16} />
              Links
              {activeTab === 'links' && (
                <div className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-[var(--color-accent)] rounded-t-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('images')}
              className={[
                'flex items-center gap-2 pb-2 px-1 text-[15px] font-medium transition-colors relative cursor-pointer',
                activeTab === 'images' ? 'text-[var(--color-text)] font-semibold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
              ].join(' ')}
            >
              <ImageIcon size={16} />
              Images
              {activeTab === 'images' && (
                <div className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-[var(--color-accent)] rounded-t-full" />
              )}
            </button>
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
          className="w-full max-w-3xl mx-auto flex flex-col px-4 md:px-6 pt-6"
          style={{ paddingBottom: contentBottomPadding }}
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
                  style={{ scrollMarginBottom: ASK_INPUT_OVERLAY_HEIGHT_PX }}
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

      {hasCompletedAnswer && (
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
