import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Favicon } from '@/components/ui/Favicon';
import { extractDomain } from '@/lib/utils/url';
import type { SourcePreviewItem } from '@/types/api.types';
import type { MouseEvent } from 'react';

function cleanSnippetText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#+\s+/, '')
    .replace(/^[*-+]\s+/, '')
    .trim();
}

interface CitationTooltipCardProps {
  sources: SourcePreviewItem[];
  activeIndex: number;
  onPrevious: (event: MouseEvent) => void;
  onNext: (event: MouseEvent) => void;
}

export function CitationTooltipCard({
  sources,
  activeIndex,
  onPrevious,
  onNext,
}: CitationTooltipCardProps) {
  const activeSource = sources[activeIndex];
  const domainName = activeSource.domain || extractDomain(activeSource.url, 'website');

  return (
    <span className="h-[232px] overflow-hidden bg-[var(--color-sidebar)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-3.5 gap-3 flex flex-col">
      <span className="flex items-center justify-between border-b border-[var(--color-border)]/40 pb-2">
        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPrevious}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer p-1 rounded-full hover:bg-[var(--color-surface-hover)] flex items-center justify-center border-0"
            aria-label="Previous source"
          >
            <ChevronLeft size={14} className="stroke-[2.5]" />
          </button>
          <span className="text-[12px] font-medium text-[var(--color-text-muted)] select-none font-sans">
            {activeIndex + 1}/{sources.length}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer p-1 rounded-full hover:bg-[var(--color-surface-hover)] flex items-center justify-center border-0"
            aria-label="Next source"
          >
            <ChevronRight size={14} className="stroke-[2.5]" />
          </button>
        </span>

        <span className="flex items-center gap-2">
          <span className="flex -space-x-1.5 overflow-hidden">
            {sources.slice(0, 3).map((source) => {
              const sourceDomain = source.domain || extractDomain(source.url, 'website');

              return (
                <Favicon
                  key={source.sourceId}
                  domain={sourceDomain}
                  size={16}
                  className="inline-block ring-2 ring-[var(--color-sidebar)] bg-[var(--color-text)] object-contain"
                />
              );
            })}
          </span>
          <span className="text-[12px] font-normal text-[var(--color-text-muted)] leading-none select-none font-sans">
            {sources.length} sources
          </span>
        </span>
      </span>

      <span className="flex flex-col gap-2.5">
        <span className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
          <span className="w-5 h-5 rounded-full bg-[var(--color-text)] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            <Favicon
              domain={domainName}
              size={12}
              className="bg-[var(--color-text)]"
            />
          </span>
          <span className="font-medium lowercase font-sans">{domainName}</span>
        </span>

        <a
          href={activeSource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-semibold text-[var(--color-text)] leading-snug hover:underline text-left cursor-pointer transition-colors font-sans line-clamp-2"
        >
          {activeSource.title || 'Source link'}
        </a>

        {activeSource.snippet && (
          <span
            className="text-[12.5px] text-[var(--color-text-muted)] font-normal leading-[1.45] select-text font-sans block"
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 4,
              overflow: 'hidden',
            }}
          >
            {cleanSnippetText(activeSource.snippet)}
          </span>
        )}
      </span>
    </span>
  );
}
