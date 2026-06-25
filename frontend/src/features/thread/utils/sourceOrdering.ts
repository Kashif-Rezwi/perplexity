import type { SourcePreviewItem } from '@/types/api.types';

export function sortSourcesForLinks(
  sources: readonly SourcePreviewItem[],
): SourcePreviewItem[] {
  return sources.slice().sort((a, b) => {
    const citationDiff = a.citationNumber - b.citationNumber;
    if (citationDiff !== 0) return citationDiff;

    return a.sourceId.localeCompare(b.sourceId);
  });
}
