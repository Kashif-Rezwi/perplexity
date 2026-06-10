'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ChevronDown, ArrowUp, Loader2 } from 'lucide-react';
import { postAsk } from '@/lib/api/ask.api';
import { useHistoryStore } from '@/store/historyStore';
import { ApiError } from '@/lib/api/client';

export interface AskInputRef {
  setQuestion: (q: string) => void;
  submitQuestion: (q: string) => void;
}

interface AskInputProps {
  threadId?: string;
}

export const AskInput = forwardRef<AskInputRef, AskInputProps>(
  function AskInput({ threadId }, ref) {
    const [question, setQuestion] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();
    const addThread = useHistoryStore((state) => state.addThread);

    const queryClient = useQueryClient();

    const { mutate: askQuestion, isPending, error } = useMutation({
      mutationFn: (q: string) => postAsk(q, threadId),
      onSuccess: (data) => {
        setQuestion('');
        
        if (!threadId) {
          // New thread: add to history and redirect
          addThread({
            id: data.thread.threadId,
            title: data.thread.title,
          });
          router.push(`/thread/${data.thread.threadId}`);
        } else {
          // Existing thread: invalidate the query to refetch latest turn
          queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
        }
      },
    });

    useImperativeHandle(ref, () => ({
      setQuestion: (q: string) => {
        setQuestion(q);
      },
      submitQuestion: (q: string) => {
        setQuestion(q);
        if (q.trim() && !isPending) {
          askQuestion(q.trim());
        }
      }
    }));

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || isPending) return;
    askQuestion(question.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
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
          "relative w-full flex flex-col bg-[var(--color-surface)]",
          "border border-[var(--color-border)] rounded-2xl",
          "transition-all duration-[var(--transition-fade)]",
          "focus-within:border-[var(--color-border-subtle)] focus-within:ring-1 focus-within:ring-[var(--color-border)]",
          "shadow-sm"
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
            className={[
              "w-full bg-transparent text-[var(--color-text)]",
              "placeholder:text-[var(--color-text-faint)]",
              "resize-none outline-none overflow-hidden",
              "text-[16px] leading-relaxed",
              isPending ? "opacity-50" : ""
            ].join(' ')}
            style={{ minHeight: '52px' }}
            autoFocus
          />
        </div>
        
        <div className="flex items-center justify-between px-3 pb-3">
          {/* Left section tools */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded-full transition-colors"
            >
              <Plus size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-bg)] hover:bg-[#1a1a1a] text-[var(--color-text)] text-[13px] font-medium border border-[var(--color-border-subtle)] transition-colors"
            >
              <Search size={14} strokeWidth={2} />
              <span>Search</span>
              <ChevronDown size={14} className="text-[var(--color-text-muted)] ml-0.5" strokeWidth={2} />
            </button>

          </div>

          {/* Right section tools */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <span>Model</span>
              <ChevronDown size={14} strokeWidth={2} />
            </button>

            <button
              type="submit"
              disabled={!question.trim() || isPending}
              aria-label="Submit question"
              className={[
                "flex items-center justify-center w-8 h-8 rounded-full",
                "transition-all duration-[var(--transition-hover)]",
                question.trim() && !isPending
                  ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] cursor-pointer"
                  : "bg-[#272727] text-[#555555] cursor-not-allowed"
              ].join(' ')}
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <ArrowUp size={18} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="mt-4 px-4 py-2 w-full text-sm text-red-400 bg-red-400/10 rounded-lg border border-red-400/20 text-center">
          {error instanceof ApiError ? error.message : "Failed to connect to the server."}
        </div>
      )}
    </div>
  );
});
