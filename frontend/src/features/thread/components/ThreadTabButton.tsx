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
        'flex items-center gap-2 h-full px-0 text-[15px] font-medium transition-colors relative',
        disabled
          ? 'cursor-not-allowed text-[var(--color-text-faint)] opacity-70'
          : 'cursor-pointer',
        !disabled && isActive
          ? 'text-[var(--color-state-active)] font-medium'
          : '',
        !disabled && !isActive
          ? 'text-[var(--color-text-muted)] hover:text-[var(--color-state-hover)]'
          : '',
      ].join(' ')}
    >
      {icon}
      {label}
      {!disabled && isActive && (
        <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[var(--color-state-active)] rounded-t-full" />
      )}
    </button>
  );
}
