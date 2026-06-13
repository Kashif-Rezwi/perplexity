import type { ReactNode } from 'react';

interface ThreadTabButtonProps {
  label: string;
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ThreadTabButton({
  label,
  icon,
  isActive,
  onClick,
  disabled = false,
}: ThreadTabButtonProps) {
  return (
    <button
      type="button"
      data-text-tab="true"
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex items-center gap-2 pb-4 px-0 text-[15px] font-medium transition-colors relative focus-visible:outline-none focus-visible:text-[var(--color-text)]',
        disabled
          ? 'cursor-not-allowed text-[var(--color-text-faint)] opacity-70'
          : 'cursor-pointer',
        !disabled && isActive
          ? 'text-[var(--color-text)] font-medium'
          : '',
        !disabled && !isActive
          ? 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          : '',
      ].join(' ')}
    >
      {icon}
      {label}
      {!disabled && isActive && (
        <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[var(--color-text)] rounded-t-full" />
      )}
    </button>
  );
}
