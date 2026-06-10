import type { TurnItem } from '@/types/api.types';
import { QuestionBlock } from './QuestionBlock';
import { AnswerMarkdown } from './AnswerMarkdown';
import { FollowUpSuggestions } from './FollowUpSuggestions';
import {
  Loader2, Forward, Download, Copy, RotateCw,
  ThumbsUp, ThumbsDown, Check,
} from 'lucide-react';
import { Favicon } from '@/components/ui/Favicon';
import { extractDomain } from '@/lib/utils/url';
import { useState } from 'react';

interface ThreadTurnProps {
  turn: TurnItem;
  isLast?: boolean;
  onViewSources?: () => void;
  onSelectFollowUp?: (q: string) => void;
  onCitationClick?: (num: number) => void;
}

export function ThreadTurn({
  turn,
  isLast,
  onViewSources,
  onSelectFollowUp,
  onCitationClick
}: ThreadTurnProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [vote, setVote] = useState<'up' | 'down' | null>(null);

  const handleCopy = () => {
    if (turn.answerMarkdown) {
      navigator.clipboard.writeText(turn.answerMarkdown);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleVote = (direction: 'up' | 'down') => {
    setVote((prev) => (prev === direction ? null : direction));
  };

  return (
    <div className="flex flex-col gap-6 pb-6">
      <QuestionBlock question={turn.question} />

      <div className="flex flex-col gap-6">
        {turn.status === 'pending' ? (
          <div className="flex items-center gap-3 text-[var(--color-text-muted)] py-4">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm font-medium tracking-wide">Thinking...</span>
          </div>
        ) : null}

        {turn.status === 'failed' ? (
          <div className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20 text-sm">
            {turn.errorMessage || "An error occurred while generating the answer."}
          </div>
        ) : null}


        {turn.status === 'completed' && turn.answerMarkdown ? (
          <AnswerMarkdown 
            markdown={turn.answerMarkdown} 
            sources={turn.sources} 
            turnId={turn.turnId} 
            onCitationClick={onCitationClick}
          />
        ) : null}

        {/* Turn Action Bar */}
        {turn.status === 'completed' ? (
          <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-4 mt-2">
            {/* Left Actions */}
            <div className="flex items-center gap-4 text-[var(--color-text-muted)]">
              <button
                title="Share (Coming soon)"
                aria-label="Share turn answer (Coming soon)"
                className="opacity-50 cursor-not-allowed"
                disabled
              >
                <Forward size={16} />
              </button>
              <button
                title="Save (Coming soon)"
                aria-label="Save answer to collections (Coming soon)"
                className="opacity-50 cursor-not-allowed"
                disabled
              >
                <Download size={16} />
              </button>
              <button
                title="Copy"
                aria-label="Copy answer markdown"
                onClick={handleCopy}
                className={[
                  'transition-colors cursor-pointer',
                  isCopied
                    ? 'text-[var(--color-accent)]'
                    : 'hover:text-[var(--color-text)]',
                ].join(' ')}
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <button
                title="Regenerate (Coming soon)"
                aria-label="Regenerate answer (Coming soon)"
                className="opacity-50 cursor-not-allowed"
                disabled
              >
                <RotateCw size={16} />
              </button>

              {/* Sources link */}
              {turn.sources && turn.sources.length > 0 && (
                <button
                  onClick={onViewSources}
                  aria-label="View sources list"
                  className="flex items-center gap-2 group hover:opacity-95 transition-opacity cursor-pointer border border-[var(--color-border)] rounded-full px-2.5 py-1 bg-[var(--color-surface)]"
                >
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {turn.sources.slice(0, 3).map((s, idx) => {
                      const sDomain = s.domain || extractDomain(s.url, 'website');
                      return (
                        <Favicon
                          key={s.sourceId || idx}
                          domain={sDomain}
                          size={14}
                          className="inline-block ring-1 ring-[var(--color-bg)] bg-white object-contain"
                        />
                      );
                    })}
                  </div>
                  <span className="text-[12px] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors leading-none">
                    {turn.sources.length} sources
                  </span>
                </button>
              )}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4 text-[var(--color-text-muted)] font-sans">
              <button 
                aria-label="Upvote this answer"
                onClick={() => handleVote('up')}
                className={[
                  'transition-colors cursor-pointer',
                  vote === 'up'
                    ? 'text-[var(--color-accent)]'
                    : 'hover:text-[var(--color-text)]',
                ].join(' ')}
              >
                <ThumbsUp size={16} />
              </button>
              <button 
                aria-label="Downvote this answer"
                onClick={() => handleVote('down')}
                className={[
                  'transition-colors cursor-pointer',
                  vote === 'down'
                    ? 'text-[var(--color-accent)]'
                    : 'hover:text-[var(--color-text)]',
                ].join(' ')}
              >
                <ThumbsDown size={16} />
              </button>
            </div>
          </div>
        ) : null}

        {isLast && turn.status === 'completed' && onSelectFollowUp && (
          <FollowUpSuggestions
            questions={turn.suggestedFollowUpQuestions ?? []}
            onSelect={onSelectFollowUp}
          />
        )}
      </div>
    </div>
  );
}
