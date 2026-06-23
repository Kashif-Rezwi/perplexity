import { describe, expect, it } from 'vitest';
import {
  markdownToPlainText,
  serializeTurnMarkdown,
  serializeTurnPlainText,
} from './threadExport';

describe('thread export utilities', () => {
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
});
