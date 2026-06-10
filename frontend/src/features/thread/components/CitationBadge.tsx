'use client';

import type { SourceItem } from '@/types/api.types';
import { ExternalLink } from 'lucide-react';
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface CitationBadgeProps {
  number: number;
  source?: SourceItem;
  turnId?: string;
  onCitationClick?: (num: number) => void;
}

export function CitationBadge({ number, source, turnId, onCitationClick }: CitationBadgeProps) {
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

  const domainName = source.domain || '';

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
  };

  return (
    <span
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Source ${number}: ${source.title || source.url}`}
      className={[
        "inline-flex items-center justify-center",
        "px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)]",
        "text-[10px] font-bold text-[var(--color-accent)] leading-none no-underline",
        "hover:bg-[var(--color-accent-faint)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-hover)]",
        "transition-all duration-[var(--transition-hover)] cursor-pointer select-none",
        "relative top-[-3px] mx-0.5 group/badge"
      ].join(' ')}
    >
      {number}

      {/* Tooltip Card — all block-level display is achieved via CSS on span elements */}
      <span
        className={[
          "absolute bottom-full left-1/2 -translate-x-1/2 pb-2 w-72 md:w-80",
          "invisible group-hover/badge:visible opacity-0 group-hover/badge:opacity-100",
          "scale-95 group-hover/badge:scale-100 transition-all duration-150 pointer-events-none group-hover/badge:pointer-events-auto",
          "z-50 origin-bottom font-sans text-left"
        ].join(' ')}
        style={{ display: 'block' }}
      >
        <span
          className="bg-[var(--color-sidebar)] border border-[var(--color-border)] rounded-xl shadow-2xl p-3.5 gap-2"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <span className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="w-5 h-5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://www.google.com/s2/favicons?sz=64&domain=${domainName}`}
                className="w-3.5 h-3.5 object-contain"
                alt=""
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </span>
            <span className="font-medium truncate max-w-[150px]">{domainName}</span>
            <span className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded text-[var(--color-text-muted)] ml-auto font-mono">
              Source {number}
            </span>
          </span>

          {/* Title */}
          <span className="flex items-start justify-between gap-1 mt-0.5">
            <span
              className="text-[13px] font-semibold text-[var(--color-text)] leading-snug group-hover/badge:text-white transition-colors"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {source.title || 'Source link'}
            </span>
            {/* Open source URL via explicit button — NOT a nested <a> */}
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Open ${source.title || source.url} in new tab`}
              onClick={(e) => {
                e.stopPropagation();
                window.open(source.url, '_blank', 'noopener,noreferrer');
              }}
              className="text-[var(--color-text-muted)] shrink-0 mt-0.5 hover:text-[var(--color-accent)] transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              <ExternalLink size={12} className="animate-pulse" />
            </button>
          </span>

          {/* Snippet — rendered with all span-based overrides so no block elements nest inside <p> */}
          {source.snippet && (
            <span
              className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-bg)]/50 border border-[var(--color-border-subtle)] p-2.5 rounded-lg font-normal overflow-y-auto"
              style={{ display: 'block', maxHeight: 120 }}
            >
              <ReactMarkdown
                components={{
                  // All block-level elements replaced with <span> + display:block to avoid invalid nesting
                  p: ({ ...props }) => <span style={{ display: 'block' }} className="mb-1 last:mb-0 leading-relaxed" {...props} />,
                  h1: ({ ...props }) => <span style={{ display: 'block' }} className="font-semibold text-[12px] text-[var(--color-text)] mb-1" {...props} />,
                  h2: ({ ...props }) => <span style={{ display: 'block' }} className="font-semibold text-[11.5px] text-[var(--color-text)] mb-1" {...props} />,
                  h3: ({ ...props }) => <span style={{ display: 'block' }} className="font-semibold text-[11px] text-[var(--color-text)] mb-1" {...props} />,
                  h4: ({ ...props }) => <span style={{ display: 'block' }} className="font-semibold text-[11px] text-[var(--color-text)] mb-1" {...props} />,
                  h5: ({ ...props }) => <span style={{ display: 'block' }} className="font-semibold text-[11px] text-[var(--color-text)] mb-1" {...props} />,
                  h6: ({ ...props }) => <span style={{ display: 'block' }} className="font-semibold text-[11px] text-[var(--color-text)] mb-1" {...props} />,
                  // Links inside snippet open in new tab — no nested <a> risk since outer is <span role="link">
                  a: ({ href, children }) => (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (href) window.open(href, '_blank', 'noopener,noreferrer');
                      }}
                      className="text-[var(--color-text-link)] underline cursor-pointer hover:no-underline bg-transparent border-0 p-0 font-[inherit] text-[inherit]"
                    >
                      {children}
                    </button>
                  ),
                  ul: ({ ...props }) => <span style={{ display: 'block', paddingLeft: '1rem', marginBottom: '0.5rem' }} {...props} />,
                  ol: ({ ...props }) => <span style={{ display: 'block', paddingLeft: '1rem', marginBottom: '0.5rem' }} {...props} />,
                  li: ({ ...props }) => <span style={{ display: 'block' }} className="leading-relaxed before:content-['•'] before:mr-1.5 before:text-[var(--color-text-muted)]" {...props} />,
                  code: ({ ...props }) => <code className="bg-[var(--color-surface)] px-1 py-0.5 rounded font-mono text-[10px]" {...props} />,
                  pre: ({ ...props }) => <span style={{ display: 'block' }} className="bg-[var(--color-surface)] p-1.5 rounded font-mono text-[10px] my-1 overflow-x-auto" {...props} />,
                }}
              >
                {source.snippet}
              </ReactMarkdown>
            </span>
          )}

          {/* Action Footer */}
          <span className="text-[10px] font-medium text-[var(--color-text-muted)] flex items-center gap-1 border-t border-[var(--color-border-subtle)] pt-2 mt-1">
            <span className="text-[var(--color-accent)]">Click badge</span> to scroll,{' '}
            <span className="text-[var(--color-accent)]">hover</span> to preview
          </span>
        </span>
      </span>
    </span>
  );
}
