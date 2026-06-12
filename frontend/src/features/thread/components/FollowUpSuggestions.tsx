import { CornerDownRight } from 'lucide-react';

interface FollowUpSuggestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function FollowUpSuggestions({ questions = [], onSelect }: FollowUpSuggestionsProps) {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="flex flex-col mt-3 font-sans">
      <h3 className="text-[18px] font-semibold text-[var(--color-text)] mb-3 tracking-[-0.005em]">
        Follow-ups
      </h3>
      <ul className="flex flex-col border-t border-[var(--color-border-subtle)]">
        {questions.map((question, index) => (
          <li
            key={question}
            className={[
              index > 0 ? 'border-t border-[var(--color-border-subtle)]' : '',
            ].join(' ')}
          >
            <button
              type="button"
              onClick={() => onSelect(question)}
              className={[
                'flex w-full items-start gap-2.5 text-left',
                'py-3 text-[14px] leading-snug',
                'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                'transition-colors cursor-pointer group',
              ].join(' ')}
            >
              <CornerDownRight
                size={15}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0 text-[var(--color-text-faint)] group-hover:text-[var(--color-text-muted)] transition-colors"
              />
              <span className="line-clamp-3">{question}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
