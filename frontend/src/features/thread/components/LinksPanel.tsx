'use client';

import { useEffect } from 'react';
import type { SourcePreviewItem } from '@/types/api.types';
import { Favicon } from '@/components/ui/Favicon';
import { extractDomain } from '@/lib/utils/url';

interface LinksPanelProps {
  sources: SourcePreviewItem[];
  searchQuery?: string;
  isLoading?: boolean;
  errorMessage?: string | null;
  highlightedNumber?: number | null;
  onClearHighlight?: () => void;
}

export function LinksPanel({
  sources,
  searchQuery,
  isLoading = false,
  errorMessage,
  highlightedNumber,
  onClearHighlight,
}: LinksPanelProps) {
  useEffect(() => {
    if (highlightedNumber !== null && highlightedNumber !== undefined) {
      const element = document.getElementById(`source-link-${highlightedNumber}`);
      if (element) {
        // Scroll the element into view smoothly after a tiny delay to allow tab render
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);

        // Notify parent to clear the highlight state after 2 seconds
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

  if (isLoading) {
    return (
      <div className="text-[var(--color-text-muted)] text-sm py-4">
        Loading links...
      </div>
    );
  }

  if (errorMessage && sources.length === 0) {
    return (
      <div className="text-[var(--color-error)] text-sm py-4">
        {errorMessage}
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="text-[var(--color-text-muted)] text-sm py-4">
        No links available for this answer.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full animate-in fade-in duration-300 font-sans pb-10">
      {searchQuery && (
        <div className="text-[13px] text-[var(--color-text-muted)] mb-1.5 px-1">
          Search results for: <span className="text-[var(--color-text)] font-semibold">{searchQuery}</span>
        </div>
      )}

      <div className="flex flex-col">
        {sources.map((source: SourcePreviewItem, index: number) => {
          const domainName = source.domain || extractDomain(source.url, 'website');
          const isHighlighted = source.citationNumber === highlightedNumber;

          return (
            <a
              key={source.sourceId || index}
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
              {/* Header: Favicon + Domain/URL info */}
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

              {/* Title (teal link text) */}
              <h4 className="text-[14px] font-semibold text-[var(--color-text-link)] group-hover:underline decoration-[var(--color-text-link)] underline-offset-2 leading-snug mt-3">
                {source.title}
              </h4>

              {/* Snippet */}
              <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed line-clamp-2 mt-1.5 font-normal">
                {source.snippet}
              </p>
            </a>
          );
        })}
      </div>
    </div>
  );
}
