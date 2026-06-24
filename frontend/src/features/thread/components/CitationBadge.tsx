'use client';

import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
import type { SourcePreviewItem } from '@/types/api.types';
import { useMemo, useState } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { CitationTooltipCard } from './CitationTooltipCard';
import {
  getCitationSourceList,
  getCitationSourceKey,
  resolveCitationActiveIndexByKey,
} from '../utils/citationSources';

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
  const sourcesList = useMemo(
    () => getCitationSourceList(source, allSources),
    [source, allSources],
  );
  const primarySourceKey = source ? getCitationSourceKey(source) : null;
  const [activeSourceState, setActiveSourceState] = useState(() => ({
    citationNumber: number,
    sourceKey: primarySourceKey,
  }));

  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const showTooltip = isHovered || isFocused;
  const {
    refs: { setReference, setFloating },
    floatingStyles,
  } = useFloating({
    open: showTooltip,
    placement: 'top',
    strategy: 'fixed',
    middleware: [offset(12), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const activeSourceKey =
    activeSourceState.citationNumber === number
      ? activeSourceState.sourceKey
      : primarySourceKey;
  const safeActiveIndex = resolveCitationActiveIndexByKey(
    sourcesList,
    activeSourceKey,
    source,
  );

  // If there's no matching source, render a muted/disabled badge without interactivity
  if (!source) {
    return (
      <span
        title="Unresolved citation"
        className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-[6px] bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-faint)] relative top-[-3px] mx-0.5 select-none font-sans"
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
    const nextIndex = (safeActiveIndex - 1 + sourcesList.length) % sourcesList.length;
    setActiveSourceState({
      citationNumber: number,
      sourceKey: getCitationSourceKey(sourcesList[nextIndex]),
    });
  };

  const handleNext = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const nextIndex = (safeActiveIndex + 1) % sourcesList.length;
    setActiveSourceState({
      citationNumber: number,
      sourceKey: getCitationSourceKey(sourcesList[nextIndex]),
    });
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
        ref={setReference}
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Source ${number}: ${source.title || source.url}`}
        className="relative top-[-3px] inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-[6px] bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-accent)] leading-none transition-all duration-[var(--transition-hover)] cursor-pointer select-none hover:bg-[var(--color-accent-faint)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-sans"
      >
        {number}
      </button>

      <span
        ref={setFloating}
        style={floatingStyles}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={[
          'z-30 w-[min(320px,calc(100vw-24px))] transition-all duration-150 font-sans text-left not-prose block',
          showTooltip
            ? 'visible opacity-100 scale-100 pointer-events-auto'
            : 'invisible opacity-0 scale-95 pointer-events-none',
        ].join(' ')}
      >
        <CitationTooltipCard
          sources={sourcesList}
          activeIndex={safeActiveIndex}
          onPrevious={handlePrev}
          onNext={handleNext}
        />
      </span>
    </span>
  );
}
