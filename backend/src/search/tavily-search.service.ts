import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tavily } from '@tavily/core';
import { withTimeout } from '../common/with-timeout';
import {
  DEFAULT_TAVILY_MAX_RESULTS,
  DEFAULT_TAVILY_SEARCH_DEPTH,
  DEFAULT_TAVILY_SEARCH_TIMEOUT_MS,
  TAVILY_API_KEY_CONFIG_KEY,
  TAVILY_MAX_RESULTS_CONFIG_KEY,
  TAVILY_SEARCH_DEPTH_CONFIG_KEY,
  TAVILY_SEARCH_TIMEOUT_MS_CONFIG_KEY,
} from './search.constants';
import type { SearchDepth, SearchInput, SearchResult } from './types/search.types';

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
    const apiKey = this.configService
      .get<string>(TAVILY_API_KEY_CONFIG_KEY)
      ?.trim();

    if (!apiKey) {
      throw new ServiceUnavailableException(
        `${TAVILY_API_KEY_CONFIG_KEY} is not configured`,
      );
    }

    return apiKey;
  }

  getMaxResults(): number {
    const rawValue = this.configService.get<string | number>(
      TAVILY_MAX_RESULTS_CONFIG_KEY,
    );

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return DEFAULT_TAVILY_MAX_RESULTS;
    }

    const maxResults = Number(rawValue);

    if (!Number.isInteger(maxResults) || maxResults < 1) {
      throw new ServiceUnavailableException(
        `${TAVILY_MAX_RESULTS_CONFIG_KEY} must be a positive integer`,
      );
    }

    return maxResults;
  }

  getSearchDepth(): SearchDepth {
    const searchDepth = this.configService
      .get<string>(TAVILY_SEARCH_DEPTH_CONFIG_KEY)
      ?.trim();

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
    const rawValue = this.configService.get<string | number>(
      TAVILY_SEARCH_TIMEOUT_MS_CONFIG_KEY,
    );

    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return DEFAULT_TAVILY_SEARCH_TIMEOUT_MS;
    }

    const timeoutMs = Number(rawValue);

    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
      throw new ServiceUnavailableException(
        `${TAVILY_SEARCH_TIMEOUT_MS_CONFIG_KEY} must be a positive integer`,
      );
    }

    return timeoutMs;
  }
}

function formatSearchQueryForLog(query: string): string {
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();

  return normalizedQuery.length > 160
    ? `${normalizedQuery.slice(0, 160)}...`
    : normalizedQuery;
}

function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}
