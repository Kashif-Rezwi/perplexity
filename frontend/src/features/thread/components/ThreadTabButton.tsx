import type { ReactNode } from 'react';

interface ThreadTabButtonProps {
  label: string;
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
}

export function ThreadTabButton({
  label,
  icon,
  isActive,
  onClick,
}: ThreadTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-2 pb-2 px-1 text-[15px] font-medium transition-colors relative cursor-pointer',
        isActive
          ? 'text-[var(--color-text)] font-semibold'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
      ].join(' ')}
    >
      {icon}
      {label}
      {isActive && (
        <div className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-[var(--color-accent)] rounded-t-full" />
      )}
    </button>
  );
}
