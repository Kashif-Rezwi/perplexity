'use client';

import ReactMarkdown, { Components, defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Copy } from 'lucide-react';
import type { SourcePreviewItem } from '@/types/api.types';
import { CitationBadge } from './CitationBadge';
import { remarkCitations } from '../markdown/remarkCitations';
import { copyTextToClipboard } from '@/lib/utils/clipboard';

interface AnswerMarkdownProps {
  markdown: string;
  sources?: SourcePreviewItem[];
  onCitationClick?: (num: number) => void;
}

/**
 * Removes the 'node' property from props so it doesn't get forwarded to DOM elements
 * and satisfies unused-vars lint rules.
 */
function omitNode<T extends { node?: unknown }>(props: T): Omit<T, 'node'> {
  const copy = { ...props };
  delete copy.node;
  return copy;
}

export function AnswerMarkdown({ markdown, sources = [], onCitationClick }: AnswerMarkdownProps) {
  const components: Components = {
    p: (props) => (
      <p className="mb-3.5 last:mb-0 leading-[1.65]" {...omitNode(props)} />
    ),
    a: (props) => {
      const { href, children } = props;
      const url = href || '';
      if (url.startsWith('citation:')) {
        const citationNumber = parseInt(url.replace('citation:', ''), 10);
        const source = sources.find((s) => s.citationNumber === citationNumber);
        return (
          <CitationBadge
            number={citationNumber}
            source={source}
            allSources={sources}
            onCitationClick={onCitationClick}
          />
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-text-link)] underline underline-offset-2 decoration-[var(--color-border)] hover:decoration-[var(--color-text-link)] transition-colors"
          {...omitNode(props)}
        >
          {children}
        </a>
      );
    },
    h1: (props) => (
      <h1 className="text-[21px] font-medium mt-7 mb-3 text-[var(--color-answer-heading)] leading-tight" {...omitNode(props)} />
    ),
    h2: (props) => (
      <h2 className="text-[18px] font-medium mt-6 mb-2 text-[var(--color-answer-heading)] leading-snug" {...omitNode(props)} />
    ),
    h3: (props) => (
      <h3 className="text-[16px] font-medium mt-5 mb-2 text-[var(--color-answer-heading)] leading-snug" {...omitNode(props)} />
    ),
    ul: (props) => <ul className="list-disc pl-5 mb-3.5 space-y-2" {...omitNode(props)} />,
    ol: (props) => <ol className="list-decimal pl-5 mb-3.5 space-y-2" {...omitNode(props)} />,
    li: (props) => (
      <li className="leading-[1.65] pl-1 marker:text-[var(--color-text-faint)]" {...omitNode(props)} />
    ),
    strong: (props) => (
      <strong className="font-semibold text-[var(--color-answer-heading)]" {...omitNode(props)} />
    ),
    blockquote: (props) => (
      <blockquote className="border-l-2 border-[var(--color-border)] pl-4 italic my-4 text-[var(--color-text-muted)]" {...omitNode(props)} />
    ),
    td: (props) => (
      <td className="border border-[var(--color-border)] px-4 py-2" {...omitNode(props)} />
    ),
    th: (props) => (
      <th className="border border-[var(--color-border)] px-4 py-2 font-semibold bg-[var(--color-surface)]" {...omitNode(props)} />
    ),

    // Code block and inline code
    code: (props) => {
      const { className, children } = props;
      const classNameStr = className || '';
      const match = /language-(\w+)/.exec(classNameStr);
      const isInline = !match && !classNameStr.includes('hljs');

      if (isInline) {
        return (
          <code className="bg-[var(--color-surface-hover)] text-[var(--color-answer-heading)] px-1.5 py-0.5 rounded-[4px] text-[13px] font-mono" {...omitNode(props)}>
            {children}
          </code>
        );
      }

      const language = match ? match[1] : 'text';
      const codeString = String(children).replace(/\n$/, '');

      return (
        <div className="flex flex-col bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-border)] my-5">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider font-sans">
              {language}
            </span>
            <button
              onClick={() => void copyTextToClipboard(codeString)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
              title="Copy code"
            >
              <Copy size={14} />
            </button>
          </div>
          {/* Body */}
          <div className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono">
            <code className={className} {...omitNode(props)}>
              {children}
            </code>
          </div>
        </div>
      );
    },
    pre: (props) => <>{props.children}</>,
  };

  return (
    <div className="flex flex-col gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <div className="prose prose-invert max-w-none text-[16px] text-[var(--color-answer-text)] font-serif leading-[1.65] tracking-[-0.002em]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkCitations]}
          rehypePlugins={[rehypeHighlight]}
          components={components}
          urlTransform={(url) => {
            if (url.startsWith('citation:')) return url;
            return defaultUrlTransform(url);
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
