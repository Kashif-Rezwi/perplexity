import type { TurnItem } from '@/types/api.types';
import { QuestionBlock } from './QuestionBlock';
import { AnswerMarkdown } from './AnswerMarkdown';
import { FollowUpSuggestions } from './FollowUpSuggestions';
import { FailedTurnBlock, PendingTurnBlock } from './TurnStatusBlocks';
import { TurnResponseActions } from './TurnResponseActions';

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
  const sourceCount = turn.sourceCount ?? turn.sources.length;
  const sourcePreviewItems = turn.sources.length > 0
    ? turn.sources
    : turn.citationSources ?? [];

  return (
    <div className="flex flex-col gap-6 pb-7">
      <QuestionBlock question={turn.question} />

      <div className="flex flex-col gap-6">
        {turn.status === 'pending' ? (
          <PendingTurnBlock />
        ) : null}

        {turn.status === 'failed' ? (
          <FailedTurnBlock
            question={turn.question}
            errorMessage={turn.errorMessage}
            onRetry={onRetry}
          />
        ) : null}


        {turn.status === 'completed' && turn.answerMarkdown ? (
          <AnswerMarkdown
            markdown={turn.answerMarkdown}
            sources={turn.citationSources ?? turn.sources}
            onCitationClick={onCitationClick}
          />
        ) : null}

        {turn.status === 'completed' ? (
          <TurnResponseActions
            answerMarkdown={turn.answerMarkdown}
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
