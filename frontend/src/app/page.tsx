export default function Home() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] mb-4 text-[var(--color-text-muted)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <h1 className="text-[var(--color-text)] text-[18px] font-semibold mb-2">
          Where knowledge begins
        </h1>
        <p className="text-[var(--color-text-faint)] text-[14px] leading-relaxed">
          Phase 2 layout and design system complete. The interactive ask input and feature cards will be implemented in Phase 4.
        </p>
      </div>
    </div>
  );
}
