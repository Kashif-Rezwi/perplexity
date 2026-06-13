import Link from 'next/link';
import type { ComponentType } from 'react';

type SidebarIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

type Props = {
  icon: SidebarIcon;
  label: string;
  href?: string;
  ariaLabel?: string;
  isActive?: boolean;
  isOpen: boolean;
  variant?: 'default' | 'primary';
};

export function SidebarNavItem({
  icon: Icon,
  label,
  href,
  ariaLabel,
  isActive,
  isOpen,
  variant = 'default',
}: Props) {
  const className = [
    'flex h-10 w-full items-center rounded-xl no-underline overflow-hidden whitespace-nowrap',
    'transition-colors duration-100 ease-linear',
    isOpen
      ? 'gap-2 px-2'
      : 'px-2',
    isActive
      ? 'bg-white/[0.025] text-[var(--color-text)]'
      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span
        className={[
          'grid size-6 shrink-0 place-items-center',
          variant === 'primary'
            ? 'rounded-full bg-[var(--color-surface-hover)]'
            : '',
        ].join(' ')}
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      {isOpen && (
        <span className="truncate text-sm font-normal leading-none">
          {label}
        </span>
      )}
    </>
  );

  if (!href) {
    return (
      <button
        type="button"
        title={!isOpen ? label : undefined}
        aria-label={ariaLabel ?? label}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      title={!isOpen ? label : undefined}
      scroll={false}
      aria-current={isActive ? 'page' : undefined}
      aria-label={ariaLabel}
      className={className}
    >
      {content}
    </Link>
  );
}
