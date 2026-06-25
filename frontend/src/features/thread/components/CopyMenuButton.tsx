'use client';

import { Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CopyMenuButtonProps {
  /** The icon to display in the idle state. */
  Icon: LucideIcon;
  /** Label shown when idle (e.g. "Copy thread URL"). */
  label: string;
  /** Label shown when the action was just performed (e.g. "Copied thread URL"). */
  copiedLabel: string;
  /** Whether this button is currently in the copied state. */
  isCopied: boolean;
  onClick: () => void;
}

export function CopyMenuButton({
  Icon,
  label,
  copiedLabel,
  isCopied,
  onClick,
}: CopyMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-hover)]',
        isCopied ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]',
      ].join(' ')}
    >
      {isCopied ? (
        <Check size={16} strokeWidth={1.75} className="shrink-0" />
      ) : (
        <Icon size={16} strokeWidth={1.75} className="shrink-0" />
      )}
      {isCopied ? copiedLabel : label}
    </button>
  );
}
