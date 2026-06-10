'use client';

import ReactMarkdown, { Components, defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Copy } from 'lucide-react';
import type { SourceItem } from '@/types/api.types';
import { CitationBadge } from './CitationBadge';
import React from 'react';

interface AnswerMarkdownProps {
  markdown: string;
  sources?: SourceItem[];
  turnId?: string;
  onCitationClick?: (num: number) => void;
}

interface AstNode {
  type: string;
  value?: string;
  url?: string;
  children?: AstNode[];
}

/**
 * Custom Remark AST-level plugin to parse citation patterns [n] in text nodes
 * and convert them into mdast link nodes with target URL "citation:n".
 */
function remarkCitations() {
  return (tree: AstNode) => {
    const walk = (node: AstNode) => {
      if (!node) return;
      if (node.type === 'code' || node.type === 'inlineCode') {
        return;
      }
      if (node.children) {
        const newChildren: AstNode[] = [];
        for (const child of node.children) {
          if (child.type === 'text' && child.value) {
            const regex = /\[(\d+)\]/g;
            const text = child.value;
            let lastIndex = 0;
            let match;
            const parts: AstNode[] = [];
            while ((match = regex.exec(text)) !== null) {
              const matchIndex = match.index;
              const citationNumber = match[1];
              if (matchIndex > lastIndex) {
                parts.push({ type: 'text', value: text.substring(lastIndex, matchIndex) });
              }
              parts.push({
                type: 'link',
                url: `citation:${citationNumber}`,
                children: [{ type: 'text', value: citationNumber }]
              });
              lastIndex = regex.lastIndex;
            }
            if (lastIndex < text.length) {
              parts.push({ type: 'text', value: text.substring(lastIndex) });
            }
            if (parts.length > 0) {
              newChildren.push(...parts);
            } else {
              newChildren.push(child);
            }
          } else {
            walk(child);
            newChildren.push(child);
          }
        }
        node.children = newChildren;
      }
    };
    walk(tree);
  };
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

export function AnswerMarkdown({ markdown, sources = [], turnId, onCitationClick }: AnswerMarkdownProps) {
  const components: Components = {
    p: (props) => (
      <p className="mb-4 last:mb-0 leading-[1.75]" {...omitNode(props)} />
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
            turnId={turnId}
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
      <h1 className="text-xl font-semibold mt-8 mb-4 text-[var(--color-text)]" {...omitNode(props)} />
    ),
    h2: (props) => (
      <h2 className="text-lg font-semibold mt-8 mb-4 text-[var(--color-text)]" {...omitNode(props)} />
    ),
    h3: (props) => (
      <h3 className="text-base font-semibold mt-6 mb-3 text-[var(--color-text)]" {...omitNode(props)} />
    ),
    ul: (props) => <ul className="list-disc pl-5 mb-4 space-y-2" {...omitNode(props)} />,
    ol: (props) => <ol className="list-decimal pl-5 mb-4 space-y-2" {...omitNode(props)} />,
    li: (props) => (
      <li className="leading-[1.75]" {...omitNode(props)} />
    ),
    strong: (props) => (
      <strong className="font-semibold text-[var(--color-text)]" {...omitNode(props)} />
    ),
    blockquote: (props) => (
      <blockquote className="border-l-4 border-[var(--color-border)] pl-4 italic my-4 text-[var(--color-text-muted)]" {...omitNode(props)} />
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
          <code className="bg-[var(--color-surface-hover)] text-[var(--color-text)] px-1.5 py-0.5 rounded-[4px] text-[13px] font-mono" {...omitNode(props)}>
            {children}
          </code>
        );
      }

      const language = match ? match[1] : 'text';
      const codeString = String(children).replace(/\n$/, '');

      return (
        <div className="flex flex-col bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-border)] my-6">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider font-sans">
              {language}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(codeString);
              }}
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
      <div className="prose prose-invert max-w-none text-[15px] text-[var(--color-text)] font-sans leading-[1.75] tracking-normal">
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
