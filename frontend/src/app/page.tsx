import { AskInput } from "@/features/home/components/AskInput";

export default function Home() {
  return (
    <div className="flex flex-col h-full items-center justify-center pt-[10vh] px-4">
      <div className="w-full max-w-3xl flex flex-col items-center">
        <h1 className="text-[32px] sm:text-[40px] font-semibold text-[var(--color-text)] mb-8 tracking-tight font-[family-name:var(--font-inter)]">
          Where knowledge begins
        </h1>
        <div className="w-full">
          <AskInput />
        </div>
      </div>
    </div>
  );
}
