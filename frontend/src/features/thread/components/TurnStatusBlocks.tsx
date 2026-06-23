import { AlertCircle, Loader2, RotateCw } from 'lucide-react';

type FailedTurnBlockProps = {
  question: string;
  errorMessage?: string | null;
  onRetry?: (question: string) => void;
};

export function PendingTurnBlock({
  message = 'Thinking...',
}: {
  message?: string | null;
}) {
  return (
    <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-[13.5px] font-medium leading-none py-1.5 select-none animate-in fade-in duration-300 font-sans">
      <Loader2 className="animate-spin" size={14} />
      <span>{message || 'Thinking...'}</span>
    </div>
  );
}

export function FailedTurnBlock({
  question,
  errorMessage,
  onRetry,
}: FailedTurnBlockProps) {
  return (
    <div className="flex flex-col gap-4 bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-2xl p-5 select-none font-sans max-w-2xl animate-in fade-in duration-300">
      <div className="flex items-start gap-3 text-[var(--color-error)]">
        <AlertCircle className="shrink-0 mt-0.5" size={18} />
        <div className="flex flex-col gap-1">
          <span className="text-[14.5px] font-semibold tracking-tight">
            Answer generation failed
          </span>
          <span className="text-[13px] text-[var(--color-text-muted)] leading-relaxed font-sans">
            {errorMessage ||
              'An error occurred while communicating with the AI model. Please check your network or try again.'}
          </span>
        </div>
      </div>

      {onRetry && (
        <div className="flex items-center pl-7.5">
          <button
            onClick={() => onRetry(question)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-error-btn-bg)] text-[var(--color-error)] border border-[var(--color-error-btn-border)] hover:bg-[var(--color-error-btn-hover-bg)] hover:border-[var(--color-error-btn-hover-border)] transition-all cursor-pointer font-sans"
          >
            <RotateCw size={12} />
            Retry question
          </button>
        </div>
      )}
    </div>
  );
}
