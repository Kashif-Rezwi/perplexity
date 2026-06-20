'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  HistoryIcon,
  PanelLeft,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSidebarStore } from '@/store/sidebarStore';
import { PerplexityLogo } from '@/components/ui/icons';
import { useMounted } from '@/hooks/useMounted';
import { SidebarNavItem } from './SidebarNavItem';
import { SidebarRecentThreads } from './SidebarRecentThreads';
import { SIDEBAR_NAV_ITEMS } from './sidebarNavItems';

export function Sidebar() {
  const { isOpen, setOpen } = useSidebarStore();
  const pathname = usePathname();
  const mounted = useMounted();
  // True while the sidebar is mid-collapse — suppresses hover icon
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isThreadListCollapsed, setIsThreadListCollapsed] = useState(false);

  const handleCollapse = () => {
    setIsCollapsing(true);
    setOpen(false);
  };

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
          className="md:hidden fixed inset-0 bg-[var(--color-backdrop)] z-40 animate-in fade-in duration-150 cursor-pointer"
        />
      )}

      <aside
        aria-label="Sidebar navigation"
        onTransitionEnd={() => {
          if (isCollapsing) setIsCollapsing(false);
        }}
        style={{
          width: isOpen
            ? 'var(--sidebar-width-expanded)'
            : 'var(--sidebar-width-collapsed)',
          transition:
            'width var(--transition-sidebar), transform var(--transition-sidebar)',
        }}
        className={[
          'group/sidebar flex flex-col h-screen shrink-0 sticky top-0 overflow-hidden',
          'bg-[var(--color-sidebar)]',
          isOpen ? 'border-r border-[var(--color-border-subtle)]' : '',
          // Mobile responsive fixed drawer overrides
          'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50',
          isOpen && mounted
            ? 'max-md:translate-x-0'
            : 'max-md:-translate-x-full max-md:border-none',
        ].join(' ')}
      >
        <div className="flex h-[62px] shrink-0 items-center px-2">
          {isOpen ? (
            <Link
              href="/"
              aria-label="Perplexity home"
              scroll={false}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[var(--color-text)] transition-colors duration-100 hover:bg-[var(--color-surface-hover)]"
            >
              <PerplexityLogo size={20} />
            </Link>
          ) : (
            <button
              onClick={() => setOpen(true)}
              aria-label="Expand sidebar"
              className={[
                'relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[var(--color-text)] transition-colors duration-100',
                !isCollapsing
                  ? 'group-hover/sidebar:bg-[var(--color-surface-hover)]'
                  : '',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute inset-0 grid place-items-center transition-opacity duration-100',
                  !isCollapsing ? 'group-hover/sidebar:opacity-0' : '',
                ].join(' ')}
              >
                <PerplexityLogo size={20} />
              </span>
              <span
                className={[
                  'absolute inset-0 grid place-items-center text-[var(--color-text-muted)] opacity-0 transition-opacity duration-100',
                  !isCollapsing ? 'group-hover/sidebar:opacity-100' : '',
                ].join(' ')}
              >
                <PanelLeft size={18} strokeWidth={1.75} />
              </span>
            </button>
          )}

          {isOpen && (
            <button
              onClick={handleCollapse}
              aria-label="Collapse sidebar"
              className="ml-auto flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[var(--color-text-muted)] transition-colors duration-100 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            >
              <PanelLeft size={18} strokeWidth={1.75} />
            </button>
          )}
        </div>

        <nav
          aria-label="Main navigation"
          className="flex shrink-0 flex-col gap-px px-2 pb-1"
        >
          {SIDEBAR_NAV_ITEMS.filter(({ label }) => label !== 'History').map(
            ({ icon, label, href, ariaLabel, variant }) => (
              <SidebarNavItem
                key={label}
                icon={icon}
                label={label}
                href={href}
                ariaLabel={ariaLabel}
                isActive={pathname === href}
                isOpen={isOpen}
                variant={variant}
              />
            ),
          )}

          <div
            className={[
              'group/history relative flex h-10 w-full items-center overflow-hidden whitespace-nowrap rounded-xl no-underline',
              'transition-colors duration-100 ease-linear',
              isOpen ? 'gap-2 px-2' : 'px-2',
              pathname === '/history'
                ? 'bg-[var(--color-surface-active-faint)] text-[var(--color-text)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            <Link
              href="/history"
              scroll={false}
              aria-current={pathname === '/history' ? 'page' : undefined}
              aria-label="Open chat history"
              className="absolute inset-0 z-0"
            />
            <span className="relative z-10 grid size-6 shrink-0 place-items-center">
              <HistoryIcon
                size={18}
                strokeWidth={1.75}
                className={[
                  'transition-opacity duration-100',
                  isOpen ? 'group-hover/history:opacity-0' : '',
                ].join(' ')}
              />
              {isOpen && (
                <button
                  type="button"
                  aria-label={
                    isThreadListCollapsed
                      ? 'Expand sidebar history threads'
                      : 'Collapse sidebar history threads'
                  }
                  aria-expanded={!isThreadListCollapsed}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsThreadListCollapsed((current) => !current);
                  }}
                  className="absolute inset-0 grid cursor-pointer place-items-center rounded-md opacity-0 transition-opacity duration-100 group-hover/history:opacity-100"
                >
                  {isThreadListCollapsed ? (
                    <ChevronRight size={17} strokeWidth={1.75} />
                  ) : (
                    <ChevronDown size={17} strokeWidth={1.75} />
                  )}
                </button>
              )}
            </span>
            {isOpen && (
              <span className="pointer-events-none relative z-10 truncate text-sm font-normal leading-none">
                History
              </span>
            )}
          </div>
        </nav>

        <SidebarRecentThreads
          isOpen={isOpen}
          isCollapsed={isThreadListCollapsed}
        />

        <div className="mt-auto flex h-[53px] shrink-0 flex-col">
          <div
            className={[
              'flex h-full items-center border-t',
              isOpen
                ? 'border-[var(--color-border-subtle)] px-2'
                : 'border-transparent pl-3 pr-2',
            ].join(' ')}
          >
            <div className="flex w-full items-center">
              <button
                type="button"
                aria-label="Sign in to your account"
                className={[
                  'flex items-center overflow-hidden rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] cursor-pointer',
                  isOpen
                    ? 'min-w-0 flex-1 gap-2 py-1 pl-1.5 pr-2'
                    : 'size-8 justify-center',
                ].join(' ')}
              >
                <span className="relative grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-surface-active)]">
                  <User size={15} strokeWidth={2} />
                </span>
                {isOpen && (
                  <span className="truncate text-sm font-normal leading-5">
                    Sign in
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
