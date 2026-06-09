import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive?: boolean;
  isOpen: boolean;
};

export function SidebarNavItem({ icon: Icon, label, href, isActive, isOpen }: Props) {
  return (
    <Link
      href={href}
      title={!isOpen ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'flex items-center rounded-[8px] no-underline overflow-hidden whitespace-nowrap',
        'transition-colors duration-100 ease-linear',
        isOpen
          ? 'gap-3 px-3 py-2.5'
          : 'justify-center w-10 h-10 mx-auto',
        isActive
          ? 'bg-[var(--color-surface-active)] text-[var(--color-text)]'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon size={18} strokeWidth={1.5} className="shrink-0" />
      {isOpen && (
        <span className="text-[13px] font-normal leading-none truncate">
          {label}
        </span>
      )}
    </Link>
  );
}
