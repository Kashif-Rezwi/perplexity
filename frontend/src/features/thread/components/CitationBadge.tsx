'use client';

import type { SourcePreviewItem } from '@/types/api.types';
import { useState } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { CitationTooltipCard } from './CitationTooltipCard';

interface CitationBadgeProps {
  number: number;
  source?: SourcePreviewItem;
  allSources?: SourcePreviewItem[];
  onCitationClick?: (num: number) => void;
}

export function CitationBadge({
  number,
  source,
  allSources,
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

  const handleClick = (e: MouseEvent | KeyboardEvent) => {
    if (onCitationClick) {
      e.preventDefault();
      onCitationClick(number);
      return;
    }

    e.preventDefault();
    window.open(source.url, '_blank', 'noopener,noreferrer');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick(e);
    }
    if (e.key === 'Escape') {
      setIsFocused(false);
      setIsHovered(false);
    }
  };

  const handlePrev = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveIndex((prev) => (prev - 1 + sourcesList.length) % sourcesList.length);
  };

  const handleNext = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveIndex((prev) => (prev + 1) % sourcesList.length);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e: FocusEvent) => {
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
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Source ${number}: ${source.title || source.url}`}
        className="relative top-[-3px] inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-accent)] leading-none transition-all duration-[var(--transition-hover)] cursor-pointer select-none hover:bg-[var(--color-accent-faint)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
      >
        {number}
      </button>

      <span
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={[
          "absolute bottom-full left-1/2 -translate-x-1/2 pb-2.5 w-[320px] transition-all duration-150 z-30 origin-bottom font-sans text-left not-prose block",
          showTooltip
            ? "visible opacity-100 scale-100 pointer-events-auto"
            : "invisible opacity-0 scale-95 pointer-events-none"
        ].join(' ')}
      >
        <CitationTooltipCard
          sources={sourcesList}
          activeIndex={activeIndex}
          onPrevious={handlePrev}
          onNext={handleNext}
        />
      </span>
    </span>
  );
}
