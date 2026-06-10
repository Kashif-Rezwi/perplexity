'use client';

import type { SourceItem } from '@/types/api.types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { Favicon } from '@/components/ui/Favicon';
import { extractDomain } from '@/lib/utils/url';

function cleanSnippetText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#+\s+/, '') // Remove leading markdown headers
    .replace(/^[\*\-\+]\s+/, '') // Remove leading list markers
    .trim();
}

interface CitationBadgeProps {
  number: number;
  source?: SourceItem;
  allSources?: SourceItem[];
  turnId?: string;
  onCitationClick?: (num: number) => void;
}

export function CitationBadge({
  number,
  source,
  allSources,
  turnId,
  onCitationClick,
}: CitationBadgeProps) {
  // Resolve sources array. If allSources is provided, use it. Otherwise fall back to a single item list.
  const sourcesList = allSources && allSources.length > 0
    ? allSources
    : source
    ? [source]
    : [];

  // Find index of the badge's primary source in the list to initialize the active index.
  const initialIndex = source
    ? sourcesList.findIndex((s) => s.citationNumber === source.citationNumber)
    : 0;
  
  const [activeIndex, setActiveIndex] = useState(
    initialIndex !== -1 ? initialIndex : 0
  );

  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const showTooltip = isHovered || isFocused;

  // If there's no matching source, render a muted/disabled badge without interactivity
  if (!source) {
    return (
      <span
        title="Unresolved citation"
        className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[var(--color-border-subtle)] border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-text-faint)] relative top-[-3px] mx-0.5 select-none"
      >
        {number}
      </span>
    );
  }

  const activeSource = sourcesList[activeIndex];
  const domainName = activeSource.domain || extractDomain(activeSource.url, 'website');

  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (onCitationClick) {
      e.preventDefault();
      onCitationClick(number);
      return;
    }

    const cardId = turnId ? `source-card-${turnId}-${number}` : `source-card-${number}`;
    const element = document.getElementById(cardId);
    if (element) {
      e.preventDefault();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-[var(--color-accent)]', 'bg-[var(--color-accent-faint)]');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-[var(--color-accent)]', 'bg-[var(--color-accent-faint)]');
      }, 2000);
    } else {
      // Fall back to opening the URL if no scroll target
      window.open(source.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick(e);
    }
    if (e.key === 'Escape') {
      setIsFocused(false);
      setIsHovered(false);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveIndex((prev) => (prev - 1 + sourcesList.length) % sourcesList.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveIndex((prev) => (prev + 1) % sourcesList.length);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsFocused(false);
  };

  return (
    <span
      className="relative inline-block mx-0.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* The Citation Badge Button */}
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Source ${number}: ${source.title || source.url}`}
        className="relative top-[-3px] inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-accent)] leading-none transition-all duration-[var(--transition-hover)] cursor-pointer select-none hover:bg-[var(--color-accent-faint)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
      >
        {number}
      </button>

      {/* Sibling Tooltip Card Popover — fully interactive, styled after Perplexity's dark tooltip */}
      <span
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={[
          "absolute bottom-full left-1/2 -translate-x-1/2 pb-2.5 w-[320px] transition-all duration-150 z-50 origin-bottom font-sans text-left not-prose block",
          showTooltip
            ? "visible opacity-100 scale-100 pointer-events-auto"
            : "invisible opacity-0 scale-95 pointer-events-none"
        ].join(' ')}
      >
        <span className="bg-[var(--color-sidebar)] border border-[var(--color-border)] rounded-[16px] shadow-2xl p-4 gap-3.5 flex flex-col">
          {/* Header Bar with Pagination & Stacked Favicons */}
          <span className="flex items-center justify-between border-b border-[var(--color-border)]/40 pb-2.5">
            {/* Pagination Controls */}
            <span className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrev}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-neutral-800/40 flex items-center justify-center border-0"
                aria-label="Previous source"
              >
                <ChevronLeft size={14} className="stroke-[2.5]" />
              </button>
              <span className="text-[13px] font-medium text-neutral-400 select-none font-sans">
                {activeIndex + 1}/{sourcesList.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-neutral-800/40 flex items-center justify-center border-0"
                aria-label="Next source"
              >
                <ChevronRight size={14} className="stroke-[2.5]" />
              </button>
            </span>

            {/* Stacked Favicons + Sources Count */}
            <span className="flex items-center gap-2">
              <span className="flex -space-x-1.5 overflow-hidden">
                {sourcesList.slice(0, 3).map((s, idx) => {
                  const sDomain = s.domain || extractDomain(s.url, 'website');
                  return (
                    <Favicon
                      key={s.sourceId || idx}
                      domain={sDomain}
                      size={18}
                      className="inline-block ring-2 ring-[var(--color-sidebar)] bg-white object-contain"
                    />
                  );
                })}
              </span>
              <span className="text-[13px] font-normal text-neutral-400 leading-none select-none font-sans">
                {sourcesList.length} sources
              </span>
            </span>
          </span>

          {/* Body content */}
          <span className="flex flex-col gap-2.5">
            {/* Favicon & Domain */}
            <span className="flex items-center gap-2 text-[13px] text-neutral-400">
              <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                <Favicon domain={domainName} size={14} className="bg-white" />
              </span>
              <span className="font-medium lowercase font-sans">{domainName}</span>
            </span>

            {/* Title */}
            <a
              href={activeSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[15px] font-semibold text-white leading-snug hover:underline text-left cursor-pointer transition-colors font-sans"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {activeSource.title || 'Source link'}
            </a>

            {/* Snippet */}
            {activeSource.snippet && (
              <span
                className="text-[13px] text-neutral-400 font-normal leading-[1.5] select-text font-sans block"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {cleanSnippetText(activeSource.snippet)}
              </span>
            )}
          </span>
        </span>
      </span>
    </span>
  );
}
