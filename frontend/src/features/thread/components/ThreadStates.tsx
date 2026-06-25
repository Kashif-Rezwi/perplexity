'use client';

import { useState, type ReactNode } from 'react';
import { Globe } from 'lucide-react';
import { PerplexityLogo } from '@/components/ui/icons';
import { ThreadTabButton } from './ThreadTabButton';

interface ThreadStatusStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionButton: ReactNode;
}

export function ThreadStatusState({
  icon,
  title,
  description,
  actionButton,
}: ThreadStatusStateProps) {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-24 gap-6 px-4 font-sans select-none animate-in fade-in duration-300">
      <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-2 shadow-sm">
        {icon}
      </div>
      <div className="text-center max-w-sm font-sans">
        <h2 className="text-[20px] font-semibold text-[var(--color-text)] mb-2 tracking-tight">
          {title}
        </h2>
        <p className="text-[var(--color-text-muted)] text-[13.5px] leading-relaxed">
          {description}
        </p>
      </div>
      {actionButton}
    </div>
  );
}

export function ThreadLoadingState() {
  const [activeTab, setActiveTab] = useState<'answer' | 'links'>('answer');

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-[var(--color-bg)] font-sans">
      <div className="flex-none z-20 bg-[var(--color-bg)] border-b border-[var(--color-border-subtle)] w-full h-[56px]">
        <div className="content-width flex items-center h-full font-sans">
          <div className="flex items-center gap-6 h-full">
            <ThreadTabButton
              label="Answer"
              icon={
                <PerplexityLogo
                  size={16}
                  className={activeTab === 'answer' ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}
                />
              }
              isActive={activeTab === 'answer'}
              onClick={() => setActiveTab('answer')}
            />
            <ThreadTabButton
              label="Links"
              icon={<Globe size={16} />}
              isActive={activeTab === 'links'}
              onClick={() => setActiveTab('links')}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="content-width flex flex-col pt-9 pb-20">
          {activeTab === 'answer' ? <AnswerLoadingSkeleton /> : <LinksLoadingSkeleton />}
        </div>
      </div>
    </div>
  );
}

function AnswerLoadingSkeleton() {
  return (
    <>
      <div className="w-3/4 h-8 bg-[var(--color-surface)] rounded-md animate-pulse mb-8" />

      <div className="flex flex-col gap-6">
        <div className="w-1/3 h-5 bg-[var(--color-surface)] rounded-md animate-pulse mb-4" />

        <div className="flex flex-col gap-3">
          <div className="w-full h-3 bg-[var(--color-surface)] rounded animate-pulse" />
          <div className="w-11/12 h-3 bg-[var(--color-surface)] rounded animate-pulse" />
          <div className="w-5/6 h-3 bg-[var(--color-surface)] rounded animate-pulse" />
          <div className="w-2/3 h-3 bg-[var(--color-surface)] rounded animate-pulse" />
        </div>
      </div>
    </>
  );
}

function LinksLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="mb-3 h-3 w-48 rounded bg-[var(--color-surface)] opacity-80 animate-pulse" />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="rounded-[16px] px-4 py-3.5">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--color-surface)] animate-pulse" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <div className="h-3.5 w-32 rounded bg-[var(--color-surface)] animate-pulse" />
              <div className="h-3 w-7/12 rounded bg-[var(--color-surface)] animate-pulse" />
            </div>
          </div>
          <div
            className={[
              'mt-4 h-3.5 rounded bg-[var(--color-surface)] animate-pulse',
              index === 1 ? 'w-7/12' : 'w-9/12',
            ].join(' ')}
          />
          <div className="mt-2 h-3 w-full rounded bg-[var(--color-surface)] animate-pulse" />
          <div className="mt-2 h-3 w-8/12 rounded bg-[var(--color-surface)] animate-pulse" />
        </div>
      ))}
    </div>
  );
}
