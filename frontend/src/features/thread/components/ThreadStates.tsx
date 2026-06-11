import type { ReactNode } from 'react';

interface ThreadStatusStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionButton: ReactNode;
}

export function ThreadStatusState({
  icon,
  title,
  description,
  actionButton,
}: ThreadStatusStateProps) {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-24 gap-6 px-4 font-sans select-none animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-2 shadow-sm">
        {icon}
      </div>
      <div className="text-center max-w-sm font-sans">
        <h2 className="text-[20px] font-semibold text-[var(--color-text)] mb-2 tracking-tight">
          {title}
        </h2>
        <p className="text-[var(--color-text-muted)] text-[13.5px] leading-relaxed">
          {description}
        </p>
      </div>
      {actionButton}
    </div>
  );
}

export function ThreadLoadingState() {
  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-[var(--color-bg)] font-sans">
      <div className="flex-none z-20 bg-[var(--color-bg)] border-b border-[var(--color-border)] w-full">
        <div className="flex items-center justify-between px-4 md:px-6 pt-4 pb-2 w-full max-w-3xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="w-16 h-4 bg-[var(--color-surface)] rounded animate-pulse" />
            <div className="w-16 h-4 bg-[var(--color-surface)] rounded animate-pulse" />
            <div className="w-16 h-4 bg-[var(--color-surface)] rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="w-full max-w-3xl mx-auto flex flex-col px-4 md:px-6 pt-8 pb-20">
          <div className="w-3/4 h-8 bg-[var(--color-surface)] rounded-md animate-pulse mb-8" />

          <div className="flex flex-col gap-6">
            <div className="w-1/3 h-5 bg-[var(--color-surface)] rounded-md animate-pulse mb-4" />

            <div className="flex flex-col gap-3">
              <div className="w-full h-3 bg-[var(--color-surface)] rounded animate-pulse" />
              <div className="w-11/12 h-3 bg-[var(--color-surface)] rounded animate-pulse" />
              <div className="w-5/6 h-3 bg-[var(--color-surface)] rounded animate-pulse" />
              <div className="w-2/3 h-3 bg-[var(--color-surface)] rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
