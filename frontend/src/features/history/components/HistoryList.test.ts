import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HistoryList, HistoryListSkeleton } from './HistoryList';

const noop = () => {};

describe('HistoryList', () => {
  it('renders skeleton rows instead of loading copy', () => {
    const markup = renderToStaticMarkup(createElement(HistoryListSkeleton));

    expect(markup).toContain('animate-pulse');
    expect(markup).not.toContain('Loading history');
  });

  it('renders contextual empty state copy', () => {
    const markup = renderToStaticMarkup(
      createElement(HistoryList, {
        threads: [],
        selectedThreadIds: new Set<string>(),
        onToggleSelection: noop,
        onRenameThread: noop,
        onDeleteThread: noop,
        onTogglePinThread: noop,
        emptyState: { message: 'No chats yet.' },
      }),
    );

    expect(markup).toContain('No chats yet.');
  });
});
