'use client';

import { useState } from 'react';

interface FaviconProps {
  domain: string;
  size?: number; // Size in pixels
  className?: string;
}

export function Favicon({ domain, size = 16, className = '' }: FaviconProps) {
  const [hasError, setHasError] = useState(false);
  const domainName = domain || 'website';
  const cleanDomain = domainName.replace(/^www\./i, '').toLowerCase();
  
  if (hasError || !domain) {
    const initial = cleanDomain.charAt(0).toUpperCase() || '?';
    return (
      <div
        style={{ width: size, height: size }}
        className={[
          'rounded-full bg-[var(--color-surface-active)] border border-[var(--color-border)] flex items-center justify-center overflow-hidden shrink-0 select-none shadow-sm',
          'text-[10px] font-bold text-[var(--color-text-muted)] uppercase font-sans',
          className
        ].join(' ')}
      >
        {initial}
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`https://www.google.com/s2/favicons?sz=128&domain=${cleanDomain}`}
      style={{ width: size, height: size }}
      className={['object-contain shrink-0 rounded-full', className].join(' ')}
      alt=""
      onError={() => setHasError(true)}
    />
  );
}
