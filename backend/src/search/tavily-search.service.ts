import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tavily } from '@tavily/core';
import {
  getOptionalTrimmedConfig,
  getPositiveIntegerConfig,
  getRequiredTrimmedConfig,
} from '../common/utils/config.util';
import { getErrorStack } from '../common/utils/error.util';
import { withTimeout } from '../common/utils/with-timeout.util';
import type { SearchDepth, SearchInput, SearchResult } from './types/search.types';

export const TAVILY_API_KEY_CONFIG_KEY = 'TAVILY_API_KEY';
export const TAVILY_MAX_RESULTS_CONFIG_KEY = 'TAVILY_MAX_RESULTS';
export const TAVILY_SEARCH_DEPTH_CONFIG_KEY = 'TAVILY_SEARCH_DEPTH';
export const TAVILY_SEARCH_TIMEOUT_MS_CONFIG_KEY = 'TAVILY_SEARCH_TIMEOUT_MS';

export const DEFAULT_TAVILY_MAX_RESULTS = 5;
export const DEFAULT_TAVILY_SEARCH_DEPTH: SearchDepth = 'basic';
export const DEFAULT_TAVILY_SEARCH_TIMEOUT_MS = 6000;

const SEARCH_DEPTHS = new Set<SearchDepth>([
  'basic',
  'advanced',
  'fast',
  'ultra-fast',
]);

@Injectable()
export class TavilySearchService {
  private readonly logger = new Logger(TavilySearchService.name);

  constructor(private readonly configService: ConfigService) {}

  async search(input: SearchInput): Promise<SearchResult[]> {
    const apiKey = this.getRequiredApiKey();
    const maxResults = this.getMaxResults();
    const searchDepth = this.getSearchDepth();
    const client = tavily({ apiKey });

    try {
      const response = await withTimeout(
        client.search(input.query, {
          maxResults,
          searchDepth,
        }),
        this.getSearchTimeoutMs(),
        () => new ServiceUnavailableException('Tavily search timed out'),
      );

      return response.results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score ?? null,
        publishedAt: result.publishedDate ?? null,
      }));
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        this.logger.warn(
          `${error.message} for query: ${formatSearchQueryForLog(input.query)}`,
        );
        throw error;
      }

      this.logger.error(
        `Tavily search failed for query: ${formatSearchQueryForLog(input.query)}`,
        getErrorStack(error),
      );
      throw new ServiceUnavailableException('Tavily search failed');
    }
  }

  private getRequiredApiKey(): string {
    return getRequiredTrimmedConfig(
      this.configService,
      TAVILY_API_KEY_CONFIG_KEY,
    );
  }

  getMaxResults(): number {
    return getPositiveIntegerConfig(
      this.configService,
      TAVILY_MAX_RESULTS_CONFIG_KEY,
      DEFAULT_TAVILY_MAX_RESULTS,
    );
  }

  getSearchDepth(): SearchDepth {
    const searchDepth = getOptionalTrimmedConfig(
      this.configService,
      TAVILY_SEARCH_DEPTH_CONFIG_KEY,
    );

    if (!searchDepth) {
      return DEFAULT_TAVILY_SEARCH_DEPTH;
    }

    if (!SEARCH_DEPTHS.has(searchDepth as SearchDepth)) {
      throw new ServiceUnavailableException(
        `${TAVILY_SEARCH_DEPTH_CONFIG_KEY} must be one of: ${[
          ...SEARCH_DEPTHS,
        ].join(', ')}`,
      );
    }

    return searchDepth as SearchDepth;
  }

  getSearchTimeoutMs(): number {
    return getPositiveIntegerConfig(
      this.configService,
      TAVILY_SEARCH_TIMEOUT_MS_CONFIG_KEY,
      DEFAULT_TAVILY_SEARCH_TIMEOUT_MS,
    );
  }
}

function formatSearchQueryForLog(query: string): string {
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();

  return normalizedQuery.length > 160
    ? `${normalizedQuery.slice(0, 160)}...`
    : normalizedQuery;
}
