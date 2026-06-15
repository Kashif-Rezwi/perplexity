import { Check, Copy, Share2 } from 'lucide-react';
import { Favicon } from '@/components/ui/Favicon';
import { IconButton } from '@/components/ui/IconButton';
import { extractDomain } from '@/lib/utils/url';
import { copyTextToClipboard } from '@/lib/utils/clipboard';
import type { SourceItem, SourcePreviewItem } from '@/types/api.types';
import { useEffect, useRef, useState } from 'react';

type TurnResponseActionsProps = {
  answerMarkdown: string | null;
  sourceCount: number;
  sourcePreviewItems: Array<SourceItem | SourcePreviewItem>;
  onViewSources?: () => void;
};

export function TurnResponseActions({
  answerMarkdown,
  sourceCount,
  sourcePreviewItems,
  onViewSources,
}: TurnResponseActionsProps) {
  const [isCopied, setIsCopied] = useState(false);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!answerMarkdown) {
      return;
    }

    if (await copyTextToClipboard(answerMarkdown)) {
      setIsCopied(true);
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border-subtle)] pt-4 mt-1">
      <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
        <IconButton
          label="Share this response"
          icon={<Share2 size={16} />}
          disabled
          className="cursor-not-allowed opacity-70"
        />

        <IconButton
          label="Copy answer markdown"
          onClick={handleCopy}
          active={isCopied}
          icon={isCopied ? <Check size={16} /> : <Copy size={16} />}
        />
      </div>

      <div className="flex items-center gap-3 text-[var(--color-text-muted)]">
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
    </div>
  );
}

