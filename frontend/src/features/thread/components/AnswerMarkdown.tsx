'use client';

import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Copy } from 'lucide-react';

interface AnswerMarkdownProps {
  markdown: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
const cleanProps = ({ node, ...props }: any) => props;

export function AnswerMarkdown({ markdown }: AnswerMarkdownProps) {
  const components: Components = {
    p: (props) => <p className="mb-4 last:mb-0 leading-[1.75]" {...cleanProps(props)} />,
    a: (props) => (
      <a
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--color-text-link)] underline underline-offset-2 decoration-[var(--color-border)] hover:decoration-[var(--color-text-link)] transition-colors"
        {...cleanProps(props)}
      />
    ),
    h1: (props) => <h1 className="text-xl font-semibold mt-8 mb-4 text-[var(--color-text)]" {...cleanProps(props)} />,
    h2: (props) => <h2 className="text-lg font-semibold mt-8 mb-4 text-[var(--color-text)]" {...cleanProps(props)} />,
    h3: (props) => <h3 className="text-base font-semibold mt-6 mb-3 text-[var(--color-text)]" {...cleanProps(props)} />,
    ul: (props) => <ul className="list-disc pl-5 mb-4 space-y-2" {...cleanProps(props)} />,
    ol: (props) => <ol className="list-decimal pl-5 mb-4 space-y-2" {...cleanProps(props)} />,
    li: (props) => <li className="leading-[1.75]" {...cleanProps(props)} />,
    strong: (props) => <strong className="font-semibold text-[var(--color-text)]" {...cleanProps(props)} />,
    
    // Code block and inline code
    code: (props) => {
      const { className, children } = props;
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match && !className?.includes('hljs');
      
      if (isInline) {
        return (
          <code className="bg-[#252525] text-[var(--color-text)] px-1.5 py-0.5 rounded-[4px] text-[13px] font-mono" {...cleanProps(props)}>
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
