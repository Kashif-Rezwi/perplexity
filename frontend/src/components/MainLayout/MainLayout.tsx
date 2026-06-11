'use client';

import { Sidebar } from '@/features/sidebar/Sidebar';
import { useSidebarStore } from '@/store/sidebarStore';
import { Menu } from 'lucide-react';

type Props = {
  children: React.ReactNode;
};

export function MainLayout({ children }: Props) {
  const setOpen = useSidebarStore((state) => state.setOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar />
      
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {/* Mobile Header Bar */}
        <header className="md:hidden h-14 border-b border-[var(--color-border-subtle)] bg-[var(--color-sidebar)] flex items-center px-4 shrink-0 justify-between">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation sidebar"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <Menu size={20} />
          </button>
          
          <div className="text-[14px] font-semibold text-[var(--color-text)] tracking-tight font-sans select-none">
            perplexity
          </div>
          
          <div className="w-5" /> {/* Spacer for symmetry */}
        </header>

        <div className="w-full flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
