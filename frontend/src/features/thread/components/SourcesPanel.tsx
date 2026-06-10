import type { SourceItem } from '@/types/api.types';
import { SourceCard } from './SourceCard';
import { Layers } from 'lucide-react';

interface SourcesPanelProps {
  sources: SourceItem[];
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-2 text-[var(--color-text)] mb-1">
        <Layers size={18} className="text-[var(--color-text-muted)]" />
        <h3 className="text-[15px] font-semibold tracking-wide">Sources</h3>
      </div>
      
      {/* Horizontal scroll container */}
      <div className="flex items-stretch gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        {sources.map((source) => (
          <SourceCard key={`${source.sourceId}-${source.citationNumber}`} source={source} />
        ))}
      </div>
    </div>
  );
}
