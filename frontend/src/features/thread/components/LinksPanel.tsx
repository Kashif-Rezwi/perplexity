'use client';

import { useEffect } from 'react';
import type {
  SourceHighlightTarget,
  TurnSourceGroup,
  SourcePreviewItem,
} from '@/types/api.types';
import { Favicon } from '@/components/ui/Favicon';
import { extractDomain } from '@/lib/utils/url';
import { getSourceDisplayTitle } from '../utils/sourceActions';

interface LinksPanelProps {
  groups: TurnSourceGroup[];
  highlightedTarget?: SourceHighlightTarget | null;
  onClearHighlight?: () => void;
}

export function LinksPanel({
  groups,
  highlightedTarget,
  onClearHighlight,
}: LinksPanelProps) {
  useEffect(() => {
    if (highlightedTarget) {
      const element = document.getElementById(
        getSourceElementId(
          highlightedTarget.turnId,
          highlightedTarget.citationNumber,
        ),
      );
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
  }, [highlightedTarget, onClearHighlight]);

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
            className={groupIndex > 0 ? 'mt-8 pt-7 border-t border-[var(--color-border-subtle)]' : ''}
          >
            <div className="mb-5 min-w-0">
              <p className="truncate text-[14px] font-normal leading-snug text-[var(--color-text-muted)]">
                Search results for: <span className="text-[var(--color-text)]">{group.question}</span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {group.sources.map((source, index) => (
                <SourceCard
                  key={source.sourceId || index}
                  turnId={group.turnId}
                  source={source}
                  isHighlighted={
                    highlightedTarget?.turnId === group.turnId &&
                    highlightedTarget.citationNumber === source.citationNumber
                  }
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
  turnId: string;
  source: SourcePreviewItem;
  isHighlighted: boolean;
}

function SourceCard({ turnId, source, isHighlighted }: SourceCardProps) {
  const domainName = source.domain || extractDomain(source.url, 'website');

  return (
    <article
      id={getSourceElementId(turnId, source.citationNumber)}
      className={[
        'group rounded-[16px] px-4 py-3.5 transition-colors duration-150 hover:bg-[var(--color-surface)]',
        isHighlighted
          ? 'bg-[var(--color-surface)]'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block min-w-0 no-underline"
      >
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-sidebar)]">
            <Favicon domain={domainName} size={20} />
          </div>

          <div className="flex min-w-0 flex-col overflow-hidden pt-0.5">
            <span className="truncate text-[15px] font-medium leading-tight text-[var(--color-text)]">
              {domainName}
            </span>
            <span className="mt-1 truncate text-[13px] leading-tight text-[var(--color-text-muted)]">
              {source.url}
            </span>
          </div>
        </div>

        <h3 className="mt-3 line-clamp-1 text-[15px] font-medium leading-snug text-[var(--color-text-link)]">
          {getSourceDisplayTitle(source)}
        </h3>

        <p className="mt-1 line-clamp-2 text-[14px] font-normal leading-[1.45] text-[var(--color-text-muted)]">
          {source.snippet}
        </p>
      </a>
    </article>
  );
}

function getSourceElementId(turnId: string, citationNumber: number): string {
  return `source-link-${turnId}-${citationNumber}`;
}
