'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeft, PanelRight } from 'lucide-react';
import { useEffect } from 'react';
import { useSidebarStore } from '@/store/sidebarStore';
import { SidebarNavItem } from './SidebarNavItem';

// ── Perplexity asterisk logo ─────────────────────────────────────────────────
function PerplexityLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <polygon points="14,2 16.5,11.5 14,14" fill="currentColor" opacity="0.95" />
      <polygon points="26,14 16.5,16.5 14,14" fill="currentColor" opacity="0.95" />
      <polygon points="14,26 11.5,16.5 14,14" fill="currentColor" opacity="0.95" />
      <polygon points="2,14 11.5,11.5 14,14" fill="currentColor" opacity="0.95" />
      <polygon points="21.9,6.1 15.3,13.3 14,14" fill="currentColor" opacity="0.7" />
      <polygon points="21.9,21.9 14.7,15.3 14,14" fill="currentColor" opacity="0.7" />
      <polygon points="6.1,21.9 12.7,14.7 14,14" fill="currentColor" opacity="0.7" />
      <polygon points="6.1,6.1 13.3,12.7 14,14" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

import { Plus, Clock } from 'lucide-react';

const NAV_ITEMS = [
  { icon: Plus, label: 'New', href: '/' },
  { icon: Clock, label: 'History', href: '/history' },
] as const;

export function Sidebar() {
  const { isOpen, toggle, setOpen } = useSidebarStore();
  const pathname = usePathname();

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    if (mq.matches) setOpen(false);

    const handler = (e: MediaQueryListEvent) => setOpen(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setOpen]);

  return (
    <aside
      aria-label="Sidebar navigation"
      style={{
        width: isOpen ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)',
      }}
      className={[
        'flex flex-col h-screen shrink-0 sticky top-0 overflow-hidden',
        'bg-[var(--color-sidebar)] border-r border-[var(--color-border-subtle)]',
        'transition-[width] duration-200 ease-in-out',
        'max-md:hidden',
      ].join(' ')}
    >
      {/* ── Header ── */}
      <div className={['flex items-center shrink-0 h-14', isOpen ? 'px-3 justify-between' : 'justify-center'].join(' ')}>
        {isOpen ? (
          <Link
            href="/"
            aria-label="Perplexity home"
            className="flex items-center justify-center text-white hover:opacity-80 transition-opacity duration-150 shrink-0"
          >
            <PerplexityLogo size={24} />
          </Link>
        ) : (
          <button
            onClick={() => toggle()}
            aria-label="Expand sidebar"
            className="flex items-center justify-center text-white hover:opacity-80 transition-opacity duration-150 shrink-0 cursor-pointer"
          >
            <PerplexityLogo size={24} />
          </button>
        )}

        {isOpen && (
          <button
            onClick={() => toggle()}
            aria-label="Collapse sidebar"
            className="flex items-center justify-center w-8 h-8 rounded-[6px] shrink-0 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-colors duration-100 cursor-pointer"
          >
            <PanelLeft size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* ── Nav items ── */}
      <nav
        aria-label="Main navigation"
        className={['flex flex-col gap-0.5 shrink-0', isOpen ? 'px-2 pt-1' : 'px-2 pt-2'].join(' ')}
      >
        {NAV_ITEMS.map(({ icon, label, href }) => (
          <SidebarNavItem
            key={href}
            icon={icon}
            label={label}
            href={href}
            isActive={pathname === href}
            isOpen={isOpen}
          />
        ))}
      </nav>

      {/* ── Thread history ── */}
      <div className="flex-1 overflow-y-auto py-2 min-h-0">
        {isOpen && (
          <p className="text-[12px] text-[var(--color-text-faint)] px-4 pt-4 leading-relaxed select-none">
            No recent sessions
          </p>
        )}
      </div>
    </aside>
  );
}
