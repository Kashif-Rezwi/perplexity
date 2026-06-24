'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ArrowUp, Loader2, Search } from 'lucide-react';
import { useAskSubmit } from '../hooks/useAskSubmit';
import type { AskStreamStartEvent } from '@/types/api.types';


export interface AskInputRef {
  setQuestion: (q: string) => void;
  submitQuestion: (q: string, threadId?: string) => void;
}

interface AskInputProps {
  threadId?: string;
  autoFocus?: boolean;
  placeholder?: string;
  /** Called immediately before the mutation fires, with the trimmed question. */
  onSubmitStart?: (question: string) => void;
  /** Called after the persisted streaming turn is available in the cache. */
  onStreamStart?: (event: AskStreamStartEvent) => void;
  /** Called when the mutation settles (success or error). */
  onSettled?: () => void;
}

export const AskInput = forwardRef<AskInputRef, AskInputProps>(
  function AskInput({
    threadId,
    autoFocus = true,
    placeholder = 'Ask anything...',
    onSubmitStart,
    onStreamStart,
    onSettled,
  }, ref) {
    const [question, setQuestion] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { submitAsk, isPending, errorMessage } = useAskSubmit({
      threadId,
      onSubmitStart,
      onStreamStart,
      onSettled: () => {
        onSettled?.();
      },
    });

    const submit = (trimmed: string, overrideThreadId?: string) => {
      if (submitAsk(trimmed, overrideThreadId)) {
        setQuestion('');
      }
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
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 132)}px`;
      }
    }, [question]);

    return (
      <div className="content-width flex flex-col items-center">
        <form
          onSubmit={handleSubmit}
          className={[
            'relative w-full flex flex-col bg-[var(--color-sidebar)]',
            'border border-[var(--color-border)]',
            'rounded-[18px]',
            'transition-all duration-[var(--transition-fade)]',
            'shadow-sm',
          ].join(' ')}
        >
          <div className="px-5 pt-3.5 pb-1">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isPending}
              rows={1}
              aria-label="Ask a question"
              aria-describedby="textarea-submit-instructions"
              className={[
                'w-full bg-transparent text-[var(--color-text)]',
                'placeholder:text-[var(--color-text-muted)] placeholder:font-[350] font-normal',
                'resize-none outline-none overflow-hidden',
                'text-[16px] leading-[1.35]',
                isPending ? 'opacity-50' : '',
              ].join(' ')}
              style={{ minHeight: '28px' }}
              autoFocus={autoFocus}
            />
            <span id="textarea-submit-instructions" className="sr-only">
              Press Enter to submit, Shift + Enter for a new line
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-label="Search mode"
                className="flex h-8 min-w-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-transparent px-3 text-[15px] font-medium text-[var(--color-text)]"
              >
                <Search size={16} strokeWidth={1.75} className="text-[var(--color-text-muted)]" />
                <span className="hidden sm:inline">Search</span>
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="submit"
                disabled={!question.trim() || isPending}
                aria-label="Submit question"
                className={[
                  'flex items-center justify-center h-8 w-8 rounded-full',
                  'transition-all duration-[var(--transition-hover)]',
                  question.trim() && !isPending
                    ? 'bg-[var(--color-submit-bg)] text-[var(--color-submit-text)] hover:bg-[var(--color-submit-hover-bg)] cursor-pointer'
                    : 'bg-[var(--color-submit-disabled-bg)] text-[var(--color-submit-disabled-text)] cursor-not-allowed',
                ].join(' ')}
              >
                {isPending ? (
                  <Loader2 size={15} className="animate-spin text-[var(--color-submit-text)]" />
                ) : (
                  <ArrowUp size={16} strokeWidth={2.25} />
                )}
              </button>
            </div>
          </div>
        </form>

        {errorMessage && (
          <div className="mt-4 px-4 py-2 w-full text-sm text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-lg border border-[var(--color-error-border)] text-center">
            {errorMessage}
          </div>
        )}
      </div>
    );
  },
);
