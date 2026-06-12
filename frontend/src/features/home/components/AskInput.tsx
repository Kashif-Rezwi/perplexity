'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ArrowUp, ChevronDown, Loader2, Plus, Search } from 'lucide-react';
import { useAskSubmit } from '../hooks/useAskSubmit';

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

export const AskInput = forwardRef<AskInputRef, AskInputProps>(
  function AskInput({ threadId, autoFocus = true, onSubmitStart, onSettled }, ref) {
    const [question, setQuestion] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { submitAsk, isPending, errorMessage } = useAskSubmit({
      threadId,
      onSubmitStart,
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
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    }, [question]);

    return (
      <div className="w-full max-w-[860px] mx-auto flex flex-col items-center px-4 md:px-6">
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
          <div className="pt-3 px-5">
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

          <div className="flex items-center justify-between gap-3 px-4 pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                aria-label="Upload files"
                title="Upload files"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              >
                <Plus size={16} strokeWidth={1.75} />
              </button>

              <button
                type="button"
                aria-label="Search mode"
                className="flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-[14px] font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <Search size={14} strokeWidth={1.75} />
                <span className="hidden sm:inline">Search</span>
                <ChevronDown size={14} strokeWidth={1.75} className="text-[var(--color-text-muted)]" />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Model selector"
                className="hidden h-8 items-center gap-1 rounded-full border border-transparent px-3 text-[14px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] sm:flex"
              >
                <span>Model</span>
                <ChevronDown size={16} strokeWidth={1.75} />
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

        {errorMessage && (
          <div className="mt-4 px-4 py-2 w-full text-sm text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-lg border border-[var(--color-error-border)] text-center">
            {errorMessage}
          </div>
        )}
      </div>
    );
  },
);
