import type { SourcePreviewItem } from '@/types/api.types';

export function getCitationSourceList(
  source?: SourcePreviewItem,
  allSources?: SourcePreviewItem[],
): SourcePreviewItem[] {
  return allSources && allSources.length > 0
    ? allSources
    : source
      ? [source]
      : [];
}

export function clampCitationSourceIndex(
  sources: SourcePreviewItem[],
  index: number,
): number {
  if (sources.length === 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), sources.length - 1);
}

export function getCitationSourceKey(source: SourcePreviewItem): string {
  return source.sourceId || `citation:${source.citationNumber}`;
}

export function findCitationSourceIndexByKey(
  sources: SourcePreviewItem[],
  sourceKey?: string | null,
): number {
  if (!sourceKey) {
    return -1;
  }

  return sources.findIndex(
    (candidate) => getCitationSourceKey(candidate) === sourceKey,
  );
}

export function findCitationSourceIndex(
  sources: SourcePreviewItem[],
  source?: SourcePreviewItem,
): number {
  if (!source) {
    return -1;
  }

  const sourceIdIndex = sources.findIndex(
    (candidate) => candidate.sourceId === source.sourceId,
  );

  if (sourceIdIndex !== -1) {
    return sourceIdIndex;
  }

  return sources.findIndex(
    (candidate) => candidate.citationNumber === source.citationNumber,
  );
}

export function resolveCitationActiveIndex(
  sources: SourcePreviewItem[],
  source?: SourcePreviewItem,
  fallbackIndex = 0,
): number {
  const sourceIndex = findCitationSourceIndex(sources, source);

  if (sourceIndex !== -1) {
    return sourceIndex;
  }

  return clampCitationSourceIndex(sources, fallbackIndex);
}

export function resolveCitationActiveIndexByKey(
  sources: SourcePreviewItem[],
  sourceKey: string | null,
  source?: SourcePreviewItem,
  fallbackIndex = 0,
): number {
  const keyedIndex = findCitationSourceIndexByKey(sources, sourceKey);

  if (keyedIndex !== -1) {
    return keyedIndex;
  }

  return resolveCitationActiveIndex(sources, source, fallbackIndex);
}
