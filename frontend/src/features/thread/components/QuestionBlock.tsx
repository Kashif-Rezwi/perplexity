interface QuestionBlockProps {
  question: string;
}

export function QuestionBlock({ question }: QuestionBlockProps) {
  return (
    <div className="flex w-full justify-end mb-2 font-sans">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text)] px-4 py-3 rounded-[18px] max-w-[78%] leading-relaxed text-[15px] break-words shadow-sm">
        {question}
      </div>
    </div>
  );
}
