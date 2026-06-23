import { describe, expect, it } from 'vitest';
import {
  createThreadUrl,
  createTurnUrl,
  markdownToPlainText,
  serializeThreadMarkdown,
  serializeThreadPlainText,
  serializeTurnMarkdown,
  serializeTurnPlainText,
} from './threadExport';
import type { ThreadDetailResponse } from '@/types/api.types';

describe('thread export utilities', () => {
  const thread: ThreadDetailResponse = {
    threadId: 'thread-1',
    title: 'Prisma overview',
    status: 'completed',
    mode: 'web',
    answerPreview: 'Prisma is an ORM.',
    isPinned: false,
    pinnedAt: null,
    totalSourceCount: 1,
    turnCount: 1,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    turns: [
      {
        turnId: 'turn-1',
        question: 'What is Prisma?',
        searchQuery: 'What is Prisma?',
        answerMarkdown: '**Prisma** is an ORM. [1]',
        suggestedFollowUpQuestions: [],
        status: 'completed',
        errorMessage: null,
        sourceCount: 1,
        citationCount: 1,
        sources: [
          {
            sourceId: 'source-1',
            citationNumber: 1,
            title: 'Prisma docs',
            url: 'https://www.prisma.io/docs',
            domain: 'prisma.io',
            snippet: 'Prisma documentation',
            provider: 'tavily',
            providerScore: 0.9,
            publishedAt: null,
            createdAt: '2026-06-01T00:00:00.000Z',
          },
        ],
        citations: [
          {
            citationId: 'citation-1',
            sourceId: 'source-1',
            citationNumber: 1,
            createdAt: '2026-06-01T00:00:00.000Z',
          },
        ],
        createdAt: '2026-06-01T00:00:00.000Z',
        completedAt: '2026-06-01T00:00:00.000Z',
      },
    ],
  };

  it('creates thread and turn URLs from an origin', () => {
    expect(createThreadUrl('thread-1', 'https://app.example.com/')).toBe(
      'https://app.example.com/thread/thread-1',
    );
    expect(createTurnUrl('thread-1', 'turn-1', 'https://app.example.com')).toBe(
      'https://app.example.com/thread/thread-1#turn-turn-1',
    );
  });

  it('serializes one turn as markdown with a source appendix', () => {
    const markdown = serializeTurnMarkdown({
      question: 'What is Prisma?',
      answerMarkdown: '**Prisma** is an ORM. [1]',
      sources: [
        {
          sourceId: 'source-1',
          citationNumber: 1,
          title: 'Prisma docs',
          url: 'https://www.prisma.io/docs',
          domain: 'prisma.io',
          snippet: 'Prisma documentation',
          publishedAt: null,
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
    });

    expect(markdown).toContain('## What is Prisma?');
    expect(markdown).toContain('**Prisma** is an ORM. [1]');
    expect(markdown).toContain('1. [Prisma docs](https://www.prisma.io/docs)');
  });

  it('creates readable plain text from markdown', () => {
    expect(
      markdownToPlainText('## Title\n\n**Bold** and [link](https://example.com)'),
    ).toBe('Title\n\nBold and link (https://example.com)');
  });

  it('serializes one turn as plain text', () => {
    expect(
      serializeTurnPlainText({
        question: 'What is Prisma?',
        answerMarkdown: '**Prisma** is an ORM.',
      }),
    ).toBe('What is Prisma?\n\nPrisma is an ORM.');
  });

  it('serializes a thread as markdown', () => {
    const markdown = serializeThreadMarkdown(thread);

    expect(markdown).toContain('# Prisma overview');
    expect(markdown).toContain('## What is Prisma?');
    expect(markdown).toContain('1. [Prisma docs](https://www.prisma.io/docs)');
  });

  it('serializes a thread as plain text', () => {
    expect(serializeThreadPlainText(thread)).toContain(
      'Prisma overview\n\n---\n\nWhat is Prisma?',
    );
  });
});
