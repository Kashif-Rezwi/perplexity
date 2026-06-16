import type { SearchResult } from '../../search/types/search.types';
import type { CreateTurnSourceInput } from '../../sources/types/sources.types';

const SOURCE_PROVIDER = 'tavily';
const UNKNOWN_DOMAIN = 'unknown';

/**
 * Converts Tavily search results into the source input format used for
 * persistence. Deduplicates by URL and assigns sequential citation numbers.
 */
export function mapSearchResultsToSourceInputs(
  searchResults: SearchResult[],
): CreateTurnSourceInput[] {
  const seenUrls = new Set<string>();
  const sources: CreateTurnSourceInput[] = [];

  for (const result of searchResults) {
    const url = result.url.trim();

    if (!url || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    sources.push({
      citationNumber: sources.length + 1,
      title: result.title.trim() || url,
      url,
      domain: getDomain(url),
      snippet: result.content.trim(),
      provider: SOURCE_PROVIDER,
      providerScore: result.score,
      publishedAt: parsePublishedAt(result.publishedAt),
    });
  }

  return sources;
}

function getDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname || UNKNOWN_DOMAIN;
  } catch {
    return UNKNOWN_DOMAIN;
  }
}

function parsePublishedAt(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const publishedAt = new Date(value);
  return Number.isNaN(publishedAt.getTime()) ? null : publishedAt;
}
