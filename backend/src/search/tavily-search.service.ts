import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { tavily } from '@tavily/core';
import {
  DEFAULT_TAVILY_MAX_RESULTS,
  DEFAULT_TAVILY_SEARCH_DEPTH,
  TAVILY_API_KEY_CONFIG_KEY,
  TAVILY_MAX_RESULTS_CONFIG_KEY,
  TAVILY_SEARCH_DEPTH_CONFIG_KEY,
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
  constructor(private readonly configService: ConfigService) {}

  async search(input: SearchInput): Promise<SearchResult[]> {
    const apiKey = this.getRequiredApiKey();
    const maxResults = this.getMaxResults();
    const searchDepth = this.getSearchDepth();
    const client = tavily({ apiKey });

    try {
      const response = await client.search(input.query, {
        maxResults,
        searchDepth,
      });

      return response.results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score ?? null,
      }));
    } catch {
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
}
