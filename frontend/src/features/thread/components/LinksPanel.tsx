'use client';

import type { SourceItem } from '@/types/api.types';

interface LinksPanelProps {
  sources: SourceItem[];
  searchQuery?: string;
}

export function LinksPanel({ sources, searchQuery }: LinksPanelProps) {
  if (!sources || sources.length === 0) {
    return (
      <div className="text-[var(--color-text-muted)] text-sm py-4">
        No links available for this answer.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 font-sans pb-12">
      {searchQuery && (
        <div className="text-[14px] text-[var(--color-text-muted)] mb-4 px-1">
          Search results for: <span className="text-[var(--color-text)] font-semibold">{searchQuery}</span>
        </div>
      )}

      <div className="flex flex-col">
        {sources.map((source: SourceItem, index: number) => {
          let domainName = source.domain || '';
          if (!domainName && source.url) {
            try {
              domainName = new URL(source.url).hostname.replace('www.', '');
            } catch {
              domainName = 'website';
            }
          }

          return (
            <a
              key={source.sourceId || index}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col py-5 border-b border-[var(--color-border-subtle)] last:border-b-0 group transition-all duration-100 cursor-pointer"
            >
              {/* Header: Favicon + Domain/URL info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[var(--color-border)] flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://www.google.com/s2/favicons?sz=128&domain=${domainName}`}
                    className="w-5 h-5 object-contain"
                    alt=""
                    onError={(e) => {
                      // fallback to domain initial if load fails
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      const parent = img.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className = "text-[12px] font-bold text-[var(--color-text-muted)] uppercase";
                        fallback.innerText = domainName.charAt(0) || '?';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
                
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[13px] font-medium text-[var(--color-text)] truncate leading-tight">
                    {domainName}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[280px] sm:max-w-[500px] mt-0.5 leading-none">
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
