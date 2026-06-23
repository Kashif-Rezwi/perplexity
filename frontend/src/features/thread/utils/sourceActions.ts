import type { SourcePreviewItem } from '@/types/api.types';

export function getSourceDisplayTitle(source: SourcePreviewItem): string {
  return source.title?.trim() || source.domain || source.url;
}
