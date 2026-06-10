interface QuestionBlockProps {
  question: string;
  isFirst?: boolean;
}

export function QuestionBlock({ question }: QuestionBlockProps) {
  return (
    <div className="flex w-full justify-end mb-4 font-sans">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] px-4 py-3 rounded-xl max-w-[80%] leading-relaxed text-[15px] break-words">
        {question}
      </div>
    </div>
  );
}
