import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type SelectPillProps<T extends string> = {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  align?: 'left' | 'right';
  disabled?: boolean;
};

export function HistorySelectPill<T extends string>({
  label,
  value,
  options,
  onChange,
  align = 'left',
  disabled = false,
}: SelectPillProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const isMenuOpen = isOpen && !disabled;

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isMenuOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={isMenuOpen}
        disabled={disabled}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-6 items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2 text-[11px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]"
      >
        {selected.label}
        <ChevronDown size={12} strokeWidth={1.75} />
      </button>

      {isMenuOpen && (
        <div
          className={[
            'absolute top-8 z-20 min-w-[144px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-2xl',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="flex h-8 w-full items-center justify-between rounded-xl px-2.5 text-left text-[13px] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={13} strokeWidth={1.75} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
