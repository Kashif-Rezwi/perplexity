import { describe, expect, it } from 'vitest';
import { createSseParser, type ParsedSseEvent } from './sse';

describe('createSseParser', () => {
  it('parses multiple events from one chunk', () => {
    const events: ParsedSseEvent[] = [];
    const parser = createSseParser((event) => events.push(event));

    parser.feed(
      'event: start\ndata: {"threadId":"t1"}\n\n' +
        'event: delta\ndata: {"text":"Hello"}\n\n',
    );

    expect(events).toEqual([
      { event: 'start', data: '{"threadId":"t1"}' },
      { event: 'delta', data: '{"text":"Hello"}' },
    ]);
  });

  it('handles events split across chunks', () => {
    const events: ParsedSseEvent[] = [];
    const parser = createSseParser((event) => events.push(event));

    parser.feed('event: delta\ndata: {"text":"Hel');
    parser.feed('lo"}\n\n');

    expect(events).toEqual([{ event: 'delta', data: '{"text":"Hello"}' }]);
  });

  it('flushes the final event when the stream ends without a blank separator', () => {
    const events: ParsedSseEvent[] = [];
    const parser = createSseParser((event) => events.push(event));

    parser.feed('event: done\ndata: {}');
    parser.end();

    expect(events).toEqual([{ event: 'done', data: '{}' }]);
  });

  it('parses progress events like any other SSE event', () => {
    const events: ParsedSseEvent[] = [];
    const parser = createSseParser((event) => events.push(event));

    parser.feed(
      'event: progress\ndata: {"stage":"searching","message":"Searching the web..."}\n\n',
    );

    expect(events).toEqual([
      {
        event: 'progress',
        data: '{"stage":"searching","message":"Searching the web..."}',
      },
    ]);
  });
});
