'use client';

import type { TurnItem } from '@/types/api.types';
import type { TurnItemWithCache } from '@/lib/mappers/ask.mapper';
import { AnswerMarkdown } from './AnswerMarkdown';
import { FollowUpSuggestions } from './FollowUpSuggestions';
import { FailedTurnBlock, PendingTurnBlock } from './TurnStatusBlocks';
import { TurnResponseActions } from './TurnResponseActions';

function QuestionBlock({ question }: { question: string }) {
  return (
    <div className="flex w-full justify-end mb-2 font-sans">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text)] px-4 py-3 rounded-[18px] max-w-[78%] leading-relaxed text-[15px] break-words shadow-sm">
        {question}
      </div>
    </div>
  );
}

interface ThreadTurnProps {
  turn: TurnItem | TurnItemWithCache;
  isLast?: boolean;
  onViewSources?: () => void;
  onSelectFollowUp?: (q: string) => void;
  onCitationClick?: (num: number) => void;
  onRetry?: (turnId: string, q: string) => void;
}

export function ThreadTurn({
  turn,
  isLast,
  onViewSources,
  onSelectFollowUp,
  onCitationClick,
  onRetry,
}: ThreadTurnProps) {
  const sourceCount = turn.sourceCount ?? turn.sources.length;

  // Prefer server-fetched sources, fallback to client-cached citation sources.
  const sourcePreviewItems =
    turn.sources.length > 0
      ? turn.sources
      : 'citationSources' in turn
        ? turn.citationSources
        : [];

  return (
    <div className="flex flex-col gap-6 pb-7">
      <QuestionBlock question={turn.question} />

      <div className="flex flex-col gap-6">
        {turn.status === 'pending' && !turn.answerMarkdown ? (
          <PendingTurnBlock message={turn.streamMessage} />
        ) : null}

        {turn.status === 'failed' ? (
          <FailedTurnBlock
            question={turn.question}
            errorMessage={turn.errorMessage}
            onRetry={onRetry ? (q) => onRetry(turn.turnId, q) : undefined}
          />
        ) : null}

        {(turn.status === 'completed' || turn.status === 'pending') &&
        turn.answerMarkdown ? (
          <AnswerMarkdown
            markdown={turn.answerMarkdown}
            sources={sourcePreviewItems}
            onCitationClick={onCitationClick}
          />
        ) : null}

        {turn.status === 'completed' ? (
          <TurnResponseActions
            sourceCount={sourceCount}
            sourcePreviewItems={sourcePreviewItems}
            onViewSources={onViewSources}
          />
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
