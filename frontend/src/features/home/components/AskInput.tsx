'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ChevronDown, ArrowUp, Loader2 } from 'lucide-react';
import { postAsk } from '@/lib/api/ask.api';
import { mapAskTurnToTurnItem } from '@/lib/mappers/ask.mapper';
import { useHistoryStore } from '@/store/historyStore';
import { ApiError, NetworkError } from '@/lib/api/client';
import type { ThreadDetailResponse } from '@/types/api.types';

export interface AskInputRef {
  setQuestion: (q: string) => void;
  submitQuestion: (q: string, threadId?: string) => void;
}

interface AskInputProps {
  threadId?: string;
  autoFocus?: boolean;
  /** Called immediately before the mutation fires, with the trimmed question. */
  onSubmitStart?: (question: string) => void;
  /** Called when the mutation settles (success or error). */
  onSettled?: () => void;
}

type AskMutationInput = {
  question: string;
  threadId?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof NetworkError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Failed to connect to the server.';
}

export const AskInput = forwardRef<AskInputRef, AskInputProps>(
  function AskInput({ threadId, autoFocus = true, onSubmitStart, onSettled }, ref) {
    const [question, setQuestion] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();
    const addThread = useHistoryStore((state) => state.addThread);

    const queryClient = useQueryClient();

    const { mutate: askQuestion, isPending, error, reset } = useMutation({
      mutationFn: ({ question, threadId: overrideThreadId }: AskMutationInput) =>
        postAsk(question, overrideThreadId ?? threadId),
      onSuccess: (data, variables) => {
        setQuestion('');

        const activeThreadId = variables.threadId ?? threadId;

        if (!activeThreadId) {
          addThread({
            id: data.thread.threadId,
            title: data.thread.title,
          });

          // Optimistically seed the thread detail cache to make navigation instant
          queryClient.setQueryData<ThreadDetailResponse>(
            ['thread', data.thread.threadId],
            {
              ...data.thread,
              turns: [mapAskTurnToTurnItem(data.turn)],
            }
          );

          router.push(`/thread/${data.thread.threadId}`);
          return;
        }

        queryClient.setQueryData<ThreadDetailResponse>(
          ['thread', activeThreadId],
          (existing) => {
            if (!existing) return existing;

            const newTurn = mapAskTurnToTurnItem(data.turn);
            const turnAlreadyPresent = existing.turns.some(
              (turn) => turn.turnId === newTurn.turnId,
            );

            return {
              ...existing,
              title: data.thread.title,
              status: data.thread.status,
              answerPreview: data.thread.answerPreview,
              totalSourceCount: data.thread.totalSourceCount,
              turnCount: data.thread.turnCount,
              updatedAt: data.thread.updatedAt,
              turns: turnAlreadyPresent
                ? existing.turns.map((turn) =>
                    turn.turnId === newTurn.turnId ? newTurn : turn,
                  )
                : [...existing.turns, newTurn],
            };
          },
        );

        // Background refetch ensures full source metadata is synced from GET /threads.
        void queryClient.invalidateQueries({ queryKey: ['thread', activeThreadId] });
      },
      onError: async (_error, variables) => {
        const activeThreadId = variables.threadId ?? threadId;
        if (!activeThreadId) return;

        // The proxy may fail after the backend already persisted the turn — resync.
        await queryClient.refetchQueries({ queryKey: ['thread', activeThreadId] });
        const updated = queryClient.getQueryData<ThreadDetailResponse>([
          'thread',
          activeThreadId,
        ]);

        const questionWasPersisted = updated?.turns.some(
          (turn) => turn.question === variables.question && turn.status !== 'pending',
        );

        if (questionWasPersisted) {
          reset();
        }
      },
      onSettled: () => {
        onSettled?.();
      },
    });

    const submit = (trimmed: string, overrideThreadId?: string) => {
      if (!trimmed || isPending) return;
      reset();
      onSubmitStart?.(trimmed);
      askQuestion({ question: trimmed, threadId: overrideThreadId ?? threadId });
    };

    useImperativeHandle(ref, () => ({
      setQuestion: (q: string) => {
        setQuestion(q);
      },
      submitQuestion: (q: string, overrideThreadId?: string) => {
        // Follow-up chips submit directly — do not mirror text into the input.
        submit(q.trim(), overrideThreadId);
      },
    }));

    const handleSubmit = (e?: React.FormEvent) => {
      e?.preventDefault();
      submit(question.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    }, [question]);

    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center px-4 md:px-6">
        <form
          onSubmit={handleSubmit}
          className={[
            'relative w-full flex flex-col bg-[var(--color-surface)]',
            'border border-[var(--color-border)] rounded-2xl',
            'transition-all duration-[var(--transition-fade)]',
            'focus-within:border-[var(--color-border-subtle)] focus-within:ring-1 focus-within:ring-[var(--color-border)]',
            'shadow-sm',
          ].join(' ')}
        >
          <div className="pt-3 px-4">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isPending}
              rows={1}
              aria-label="Ask a question"
              aria-describedby="textarea-submit-instructions"
              className={[
                'w-full bg-transparent text-[var(--color-text)]',
                'placeholder:text-[var(--color-text-faint)]',
                'resize-none outline-none overflow-hidden',
                'text-[16px] leading-relaxed',
                isPending ? 'opacity-50' : '',
              ].join(' ')}
              style={{ minHeight: '52px' }}
              autoFocus={autoFocus}
            />
            <span id="textarea-submit-instructions" className="sr-only">
              Press Enter to submit, Shift + Enter for a new line
            </span>
          </div>

          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="Attach files (Coming soon)"
                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-full transition-colors cursor-not-allowed"
              >
                <Plus size={18} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                title="Focus search scope (Coming soon)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] text-[13px] font-medium border border-[var(--color-border-subtle)] transition-colors cursor-not-allowed"
              >
                <Search size={14} strokeWidth={1.5} />
                <span>Search</span>
                <ChevronDown size={14} className="text-[var(--color-text-muted)] ml-0.5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                title="Change model (Coming soon)"
                className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-not-allowed"
              >
                <span>Model</span>
                <ChevronDown size={14} strokeWidth={1.5} />
              </button>

              <button
                type="submit"
                disabled={!question.trim() || isPending}
                aria-label="Submit question"
                className={[
                  'flex items-center justify-center w-8 h-8 rounded-full',
                  'transition-all duration-[var(--transition-hover)]',
                  question.trim() && !isPending
                    ? 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] cursor-pointer'
                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text-faint)] cursor-not-allowed',
                ].join(' ')}
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin text-white" />
                ) : (
                  <ArrowUp size={16} strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 px-4 py-2 w-full text-sm text-red-400 bg-red-400/10 rounded-lg border border-red-400/20 text-center">
            {getErrorMessage(error)}
          </div>
        )}
      </div>
    );
  },
);
