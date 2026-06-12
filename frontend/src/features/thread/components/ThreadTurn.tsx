import type { TurnItem } from '@/types/api.types';
import { QuestionBlock } from './QuestionBlock';
import { AnswerMarkdown } from './AnswerMarkdown';
import { FollowUpSuggestions } from './FollowUpSuggestions';
import { Loader2, Copy, RotateCw, Check, AlertCircle, Share2 } from 'lucide-react';
import { Favicon } from '@/components/ui/Favicon';
import { IconButton } from '@/components/ui/IconButton';
import { extractDomain } from '@/lib/utils/url';
import { copyTextToClipboard } from '@/lib/utils/clipboard';
import { useState } from 'react';

interface ThreadTurnProps {
  turn: TurnItem;
  isLast?: boolean;
  onViewSources?: () => void;
  onSelectFollowUp?: (q: string) => void;
  onCitationClick?: (num: number) => void;
  onRetry?: (q: string) => void;
}

export function ThreadTurn({
  turn,
  isLast,
  onViewSources,
  onSelectFollowUp,
  onCitationClick,
  onRetry,
}: ThreadTurnProps) {
  const [isCopied, setIsCopied] = useState(false);
  const sourceCount = turn.sourceCount ?? turn.sources.length;
  const sourcePreviewItems = turn.sources.length > 0
    ? turn.sources
    : turn.citationSources ?? [];

  const handleCopy = async () => {
    if (!turn.answerMarkdown) {
      return;
    }

    if (await copyTextToClipboard(turn.answerMarkdown)) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-7">
      <QuestionBlock question={turn.question} />

      <div className="flex flex-col gap-6">
        {turn.status === 'pending' ? (
          <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-[13.5px] font-medium leading-none py-1.5 select-none animate-in fade-in duration-300 font-sans">
            <Loader2 className="animate-spin" size={14} />
            <span>Thinking...</span>
          </div>
        ) : null}

        {turn.status === 'failed' ? (
          <div className="flex flex-col gap-4 bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-2xl p-5 select-none font-sans max-w-2xl animate-in fade-in duration-300">
            <div className="flex items-start gap-3 text-[var(--color-error)]">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div className="flex flex-col gap-1">
                <span className="text-[14.5px] font-semibold tracking-tight">
                  Answer generation failed
                </span>
                <span className="text-[13px] text-[var(--color-text-muted)] leading-relaxed font-sans">
                  {turn.errorMessage || "An error occurred while communicating with the AI model. Please check your network or try again."}
                </span>
              </div>
            </div>

            {onRetry && (
              <div className="flex items-center pl-7.5">
                <button
                  onClick={() => onRetry(turn.question)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-error-btn-bg)] text-[var(--color-error)] border border-[var(--color-error-btn-border)] hover:bg-[var(--color-error-btn-hover-bg)] hover:border-[var(--color-error-btn-hover-border)] transition-all cursor-pointer font-sans"
                >
                  <RotateCw size={12} />
                  Retry question
                </button>
              </div>
            )}
          </div>
        ) : null}


        {turn.status === 'completed' && turn.answerMarkdown ? (
          <AnswerMarkdown
            markdown={turn.answerMarkdown}
            sources={turn.citationSources ?? turn.sources}
            onCitationClick={onCitationClick}
          />
        ) : null}

        {turn.status === 'completed' ? (
          <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border-subtle)] pt-4 mt-1">
            <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
              <IconButton
                label="Share this response"
                icon={<Share2 size={16} />}
                disabled
                className="cursor-not-allowed opacity-70"
              />

              <IconButton
                label="Copy answer markdown"
                onClick={handleCopy}
                active={isCopied}
                icon={isCopied ? <Check size={16} /> : <Copy size={16} />}
              />
            </div>

            <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
              {sourceCount > 0 && (
                <button
                  onClick={onViewSources}
                  aria-label="View sources list"
                  className="flex items-center gap-2 group hover:opacity-95 transition-opacity cursor-pointer border border-[var(--color-border)] rounded-full px-3 py-1.5 bg-[var(--color-surface)]"
                >
                  {sourcePreviewItems.length > 0 && (
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {sourcePreviewItems.slice(0, 3).map((s, idx) => {
                        const sDomain = s.domain || extractDomain(s.url, 'website');
                        return (
                          <Favicon
                            key={s.sourceId || idx}
                            domain={sDomain}
                            size={13}
                            className="inline-block ring-1 ring-[var(--color-bg)] bg-white object-contain"
                          />
                        );
                      })}
                    </div>
                  )}
                  <span className="text-[14px] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors leading-none">
                    {sourceCount} sources
                  </span>
                </button>
              )}
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
