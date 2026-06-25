import { Check, Copy, FileText, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Favicon } from '@/components/ui/Favicon';
import { IconButton } from '@/components/ui/IconButton';
import { extractDomain } from '@/lib/utils/url';
import { copyTextToClipboard } from '@/lib/utils/clipboard';
import type { SourceItem, SourcePreviewItem } from '@/types/api.types';
import {
  serializeTurnMarkdown,
  serializeTurnPlainText,
} from '../utils/threadExport';

type CopiedAction = 'markdown' | 'text';

type TurnResponseActionsProps = {
  threadId: string;
  turnId: string;
  question: string;
  answerMarkdown: string | null;
  sourceCount: number;
  sourcePreviewItems: Array<SourceItem | SourcePreviewItem>;
  onViewSources?: () => void;
};

export function TurnResponseActions({
  question,
  answerMarkdown,
  sourceCount,
  sourcePreviewItems,
  onViewSources,
}: TurnResponseActionsProps) {
  const [copiedAction, setCopiedAction] = useState<CopiedAction | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const copyValue = async (action: CopiedAction, value: string) => {
    const didCopy = await copyTextToClipboard(value);

    if (!didCopy) {
      return;
    }

    setCopiedAction(action);

    if (copiedTimerRef.current) {
      window.clearTimeout(copiedTimerRef.current);
    }

    copiedTimerRef.current = window.setTimeout(() => {
      setCopiedAction(null);
    }, 1600);
  };

  const turnExportInput = {
    question,
    answerMarkdown,
    sources: sourcePreviewItems,
  };

  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border-subtle)] pt-4 mt-1">
      {/* Action icons */}
      <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
        {/* Share — disabled, future implementation */}
        <IconButton
          label="Share (coming soon)"
          icon={<Share2 size={16} />}
          disabled
          className="opacity-30 cursor-not-allowed"
          onClick={() => { }}
        />
        <IconButton
          label="Copy answer Markdown"
          active={copiedAction === 'markdown'}
          onClick={() =>
            void copyValue('markdown', serializeTurnMarkdown(turnExportInput))
          }
          icon={
            copiedAction === 'markdown' ? (
              <Check size={16} />
            ) : (
              <Copy size={16} />
            )
          }
        />
        <IconButton
          label="Copy answer plain text"
          active={copiedAction === 'text'}
          onClick={() =>
            void copyValue('text', serializeTurnPlainText(turnExportInput))
          }
          icon={
            copiedAction === 'text' ? (
              <Check size={16} />
            ) : (
              <FileText size={16} />
            )
          }
        />
      </div>

      {/* Sources badge */}
      {sourceCount > 0 && (
        <button
          onClick={onViewSources}
          aria-label="View sources list"
          className="flex items-center gap-2 group hover:opacity-95 transition-opacity cursor-pointer border border-[var(--color-border)] rounded-full px-3 py-1.5 bg-[var(--color-surface)]"
        >
          {sourcePreviewItems.length > 0 && (
            <div className="flex -space-x-1.5 overflow-hidden">
              {sourcePreviewItems.slice(0, 3).map((source, index) => {
                const domain = source.domain || extractDomain(source.url, 'website');
                return (
                  <Favicon
                    key={source.sourceId || index}
                    domain={domain}
                    size={13}
                    className="inline-block ring-1 ring-[var(--color-bg)] bg-[var(--color-submit-bg)] object-contain"
                  />
                );
              })}
            </div>
          )}
          <span className="text-[14px] font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors leading-none">
            {sourceCount} sources
          </span>
        </button>
      )}
    </div>
  );
}
