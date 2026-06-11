'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeft, Clock, Plus, User } from 'lucide-react';
import { useEffect } from 'react';
import { useSidebarStore } from '@/store/sidebarStore';
import { PerplexityLogo } from '@/components/ui/icons';
import { useMounted } from '@/hooks/useMounted';
import { SidebarNavItem } from './SidebarNavItem';
import { ThreadHistory } from './ThreadHistory';

const NAV_ITEMS = [
  { icon: Clock, label: 'History', href: '/' },
] as const;

export function Sidebar() {
  const { isOpen, toggle, setOpen } = useSidebarStore();
  const pathname = usePathname();
  const mounted = useMounted();

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    if (mq.matches) setOpen(false);

    const handler = (e: MediaQueryListEvent) => setOpen(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setOpen]);

  // Close sidebar on path changes for mobile experience
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    if (mq.matches) {
      setOpen(false);
    }
  }, [pathname, setOpen]);

  return (
    <>
      {isOpen && mounted && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-150 cursor-pointer"
        />
      )}

      <aside
        aria-label="Sidebar navigation"
        style={{
          width: isOpen ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)',
          transition: 'width var(--transition-sidebar), transform var(--transition-sidebar)',
        }}
        className={[
          'flex flex-col h-screen shrink-0 sticky top-0 overflow-hidden',
          'bg-[var(--color-sidebar)] border-r border-[var(--color-border-subtle)]',
          // Mobile responsive fixed drawer overrides
          'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50',
          isOpen && mounted ? 'max-md:translate-x-0' : 'max-md:-translate-x-full max-md:border-none',
        ].join(' ')}
      >
        <div className={['flex items-center shrink-0 h-14', isOpen ? 'px-3 justify-between' : 'justify-center'].join(' ')}>
          {isOpen ? (
            <Link
              href="/"
              aria-label="Perplexity home"
              scroll={false}
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

        <div className={['px-2 py-2 shrink-0', !isOpen && 'flex justify-center'].join(' ')}>
          <Link
            href="/"
            aria-label="New thread"
            title={!isOpen ? 'New thread' : undefined}
            scroll={false}
            className={[
              'flex items-center rounded-[8px] no-underline overflow-hidden whitespace-nowrap transition-colors duration-100 ease-linear border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]',
              isOpen ? 'gap-3 px-3 py-2.5 w-full' : 'justify-center w-10 h-10 mx-auto',
              'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            ].join(' ')}
          >
            <Plus size={18} strokeWidth={1.5} className="shrink-0 text-[var(--color-text-muted)]" />
            {isOpen && <span className="text-[13px] font-normal leading-none text-[var(--color-text)]">New</span>}
          </Link>
        </div>

        <nav
          aria-label="Main navigation"
          className={['flex flex-col gap-0.5 shrink-0', isOpen ? 'px-2 pt-1' : 'px-2 pt-2'].join(' ')}
        >
          {NAV_ITEMS.map(({ icon, label, href }) => (
            <SidebarNavItem
              key={label}
              icon={icon}
              label={label}
              href={href}
              isActive={pathname === href}
              isOpen={isOpen}
            />
          ))}
        </nav>

        <ThreadHistory isOpen={isOpen} />

        <div className={['shrink-0 p-2 mt-auto', !isOpen && 'flex justify-center'].join(' ')}>
          <button
            type="button"
            aria-label="Sign in to your account"
            className={[
              'flex items-center rounded-[8px] overflow-hidden whitespace-nowrap transition-colors duration-100 ease-linear',
              'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]',
              isOpen ? 'gap-3 px-3 py-2.5 w-full' : 'justify-center w-10 h-10 cursor-pointer',
            ].join(' ')}
          >
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-surface-active)] shrink-0">
              <User size={14} strokeWidth={2} />
            </div>
            {isOpen && (
              <span className="text-[13px] font-normal leading-none truncate">
                Sign in
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
