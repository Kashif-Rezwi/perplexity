import { HomeAskInput } from '@/features/home/components/HomeAskInput';


export default function Home() {
  return (
    <div className="flex flex-col h-full w-full overflow-y-auto items-center justify-center pt-[8vh] pb-12 px-4">
      <div className="w-full max-w-2xl flex flex-col items-center">
        <h1 className="text-[36px] font-[300] text-[var(--color-text)] mb-8 tracking-tighter font-sans leading-none lowercase select-none">
          perplexity
        </h1>

        <div className="w-full">
          <HomeAskInput />
        </div>
      </div>
    </div>
  );
}
