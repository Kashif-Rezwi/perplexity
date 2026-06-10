import type { SourceItem } from '@/types/api.types';

interface SourceCardProps {
  source: SourceItem;
}

export function SourceCard({ source }: SourceCardProps) {
  // Extract domain from URL if domain is missing
  let displayDomain = source.domain;
  if (!displayDomain && source.url) {
    try {
      displayDomain = new URL(source.url).hostname.replace('www.', '');
    } catch {
      displayDomain = source.url;
    }
  }

  return (
    <a 
      id={`source-card-${source.citationNumber}`}
      href={source.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className={[
        "flex flex-col flex-shrink-0 w-[200px] sm:w-[220px] p-3",
        "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl",
        "hover:bg-[var(--color-border-subtle)] hover:border-[var(--color-border-subtle)]",
        "transition-all duration-[var(--transition-hover)] cursor-pointer group"
      ].join(' ')}
    >
      <h3 className="text-sm font-medium text-[var(--color-text)] line-clamp-2 leading-snug mb-2 group-hover:text-[#ededed] transition-colors">
        {source.title || displayDomain || "Source"}
      </h3>
      
      <div className="mt-auto flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-sans">
        <div className="w-4 h-4 flex items-center justify-center rounded bg-[var(--color-border)] text-[var(--color-text)] font-semibold text-[10px] shrink-0">
          {source.citationNumber}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?sz=64&domain=${displayDomain}`}
          className="w-3.5 h-3.5 object-contain rounded shrink-0 bg-white"
          alt=""
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <span className="truncate max-w-[120px]">{displayDomain}</span>
      </div>
    </a>
  );
}
