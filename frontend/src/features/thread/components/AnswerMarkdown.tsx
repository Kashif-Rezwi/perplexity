'use client';

import ReactMarkdown, { Components } from 'react-markdown';
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
const cleanProps = ({ node, ...props }: any) => props;

function parseCitations(
  text: string, 
  sources: SourceItem[], 
  turnId?: string,
  onCitationClick?: (num: number) => void
): React.ReactNode[] {
  const regex = /\[(\d+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    const citationNumber = parseInt(match[1], 10);
    
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }
    
    const source = sources.find(s => s.citationNumber === citationNumber);
    
    parts.push(
      <CitationBadge
        key={`citation-${citationNumber}-${matchIndex}`}
        number={citationNumber}
        source={source}
        turnId={turnId}
        onCitationClick={onCitationClick}
      />
    );
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

function processNode(
  node: React.ReactNode, 
  sources: SourceItem[], 
  turnId?: string,
  onCitationClick?: (num: number) => void
): React.ReactNode {
  if (node === null || node === undefined) return node;
  
  if (typeof node === 'string') {
    return parseCitations(node, sources, turnId, onCitationClick);
  }
  
  if (typeof node === 'number' || typeof node === 'boolean') {
    return node;
  }
  
  if (Array.isArray(node)) {
    return node.map((child) => processNode(child, sources, turnId, onCitationClick));
  }
  
  if (React.isValidElement(node)) {
    const type = node.type;
    
    if (type === 'code' || type === 'pre' || type === 'a') {
      return node;
    }
    
    const props = node.props as { children?: React.ReactNode };
    if (props && props.children) {
      return React.cloneElement(node, {
        ...props,
        children: processNode(props.children, sources, turnId, onCitationClick),
      } as any);
    }
  }
  
  return node;
}

export function AnswerMarkdown({ markdown, sources = [], turnId, onCitationClick }: AnswerMarkdownProps) {
  const components: Components = {
    p: (props) => (
      <p className="mb-4 last:mb-0 leading-[1.75]" {...cleanProps(props)}>
        {processNode(props.children, sources, turnId, onCitationClick)}
      </p>
    ),
    a: (props) => (
      <a
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--color-text-link)] underline underline-offset-2 decoration-[var(--color-border)] hover:decoration-[var(--color-text-link)] transition-colors"
        {...cleanProps(props)}
      />
    ),
    h1: (props) => (
      <h1 className="text-xl font-semibold mt-8 mb-4 text-[var(--color-text)]" {...cleanProps(props)}>
        {processNode(props.children, sources, turnId, onCitationClick)}
      </h1>
    ),
    h2: (props) => (
      <h2 className="text-lg font-semibold mt-8 mb-4 text-[var(--color-text)]" {...cleanProps(props)}>
        {processNode(props.children, sources, turnId, onCitationClick)}
      </h2>
    ),
    h3: (props) => (
      <h3 className="text-base font-semibold mt-6 mb-3 text-[var(--color-text)]" {...cleanProps(props)}>
        {processNode(props.children, sources, turnId, onCitationClick)}
      </h3>
    ),
    ul: (props) => <ul className="list-disc pl-5 mb-4 space-y-2" {...cleanProps(props)} />,
    ol: (props) => <ol className="list-decimal pl-5 mb-4 space-y-2" {...cleanProps(props)} />,
    li: (props) => (
      <li className="leading-[1.75]" {...cleanProps(props)}>
        {processNode(props.children, sources, turnId, onCitationClick)}
      </li>
    ),
    strong: (props) => (
      <strong className="font-semibold text-[var(--color-text)]" {...cleanProps(props)}>
        {processNode(props.children, sources, turnId, onCitationClick)}
      </strong>
    ),
    blockquote: (props) => (
      <blockquote className="border-l-4 border-[var(--color-border)] pl-4 italic my-4 text-[var(--color-text-muted)]" {...cleanProps(props)}>
        {processNode(props.children, sources, turnId, onCitationClick)}
      </blockquote>
    ),
    td: (props) => (
      <td className="border border-[var(--color-border)] px-4 py-2" {...cleanProps(props)}>
        {processNode(props.children, sources, turnId, onCitationClick)}
      </td>
    ),
    th: (props) => (
      <th className="border border-[var(--color-border)] px-4 py-2 font-semibold bg-[var(--color-surface)]" {...cleanProps(props)}>
        {processNode(props.children, sources, turnId, onCitationClick)}
      </th>
    ),
    
    // Code block and inline code
    code: (props) => {
      const { className, children } = props;
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match && !className?.includes('hljs');
      
      if (isInline) {
        return (
          <code className="bg-[var(--color-surface-hover)] text-[var(--color-text)] px-1.5 py-0.5 rounded-[4px] text-[13px] font-mono" {...cleanProps(props)}>
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
            <code className={className} {...cleanProps(props)}>
              {children}
            </code>
          </div>
        </div>
      );
    },
    // We replace pre so it doesn't wrap our custom div again
    pre: (props) => <>{props.children}</>,
  };

  return (
    <div className="flex flex-col gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
      <div className="prose prose-invert max-w-none text-[15px] text-[var(--color-text)] font-sans leading-[1.75] tracking-normal">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={components}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
