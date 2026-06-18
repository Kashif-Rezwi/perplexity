'use client';

import { useEffect } from 'react';
import type { TurnSourceGroup, SourcePreviewItem } from '@/types/api.types';
import { Favicon } from '@/components/ui/Favicon';
import { extractDomain } from '@/lib/utils/url';

interface LinksPanelProps {
  groups: TurnSourceGroup[];
  highlightedNumber?: number | null;
  onClearHighlight?: () => void;
}

export function LinksPanel({
  groups,
  highlightedNumber,
  onClearHighlight,
}: LinksPanelProps) {
  useEffect(() => {
    if (highlightedNumber !== null && highlightedNumber !== undefined) {
      const element = document.getElementById(`source-link-${highlightedNumber}`);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        const clearTimer = setTimeout(() => {
          onClearHighlight?.();
        }, 2000);

        return () => {
          clearTimeout(timer);
          clearTimeout(clearTimer);
        };
      }
    }
  }, [highlightedNumber, onClearHighlight]);

  const hasAnySources = groups.some((g) => g.sources.length > 0);

  if (!hasAnySources) {
    return (
      <div className="text-[var(--color-text-muted)] text-sm py-4">
        No links available yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full animate-in fade-in duration-300 font-sans pb-10">
      {groups.map((group, groupIndex) => {
        if (group.sources.length === 0) return null;

        return (
          <div
            key={group.turnId}
            className={groupIndex > 0 ? 'mt-8 pt-7 border-t border-[var(--color-border)]' : ''}
          >
            {/* Header */}
            <div className="flex items-start gap-2.5 mb-4">
              <p className="text-[13px] font-semibold text-[var(--color-text)] truncate min-w-0 flex-1 leading-snug pt-px">
                {group.question}
              </p>
              <span className="shrink-0 text-[11px] font-medium text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-0.5 leading-none whitespace-nowrap">
                {group.sources.length} source{group.sources.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Source cards */}
            <div className="flex flex-col">
              {group.sources.map((source, index) => (
                <SourceCard
                  key={source.sourceId || index}
                  source={source}
                  isHighlighted={source.citationNumber === highlightedNumber}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface SourceCardProps {
  source: SourcePreviewItem;
  isHighlighted: boolean;
}

function SourceCard({ source, isHighlighted }: SourceCardProps) {
  const domainName = source.domain || extractDomain(source.url, 'website');

  return (
    <a
      id={`source-link-${source.citationNumber}`}
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        'flex flex-col py-4 border-b border-[var(--color-border-subtle)] last:border-b-0 group transition-all duration-300 cursor-pointer',
        isHighlighted
          ? 'ring-1 ring-[var(--color-accent)] bg-[var(--color-accent-faint)] rounded-[10px] px-3 -mx-3'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Header: Favicon + Domain/URL */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[10px] bg-[var(--color-sidebar)] border border-[var(--color-border)] flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
          <Favicon domain={domainName} size={18} />
        </div>

        <div className="flex flex-col overflow-hidden">
          <span className="text-[13px] font-medium text-[var(--color-text)] truncate leading-tight">
            {domainName}
          </span>
          <span className="text-[12px] text-[var(--color-text-muted)] truncate max-w-[280px] sm:max-w-[640px] mt-1 leading-none">
            {source.url}
          </span>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-[14px] font-semibold text-[var(--color-text-link)] group-hover:underline decoration-[var(--color-text-link)] underline-offset-2 leading-snug mt-3">
        {source.title}
      </h4>

      {/* Snippet */}
      <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed line-clamp-2 mt-1.5 font-normal">
        {source.snippet}
      </p>
    </a>
  );
}
