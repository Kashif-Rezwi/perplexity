import { ThreadPage } from '@/features/thread/components/ThreadPage';
import { getThread } from '@/lib/api/threads.api';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ threadId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { threadId } = await params;
  
  try {
    const thread = await getThread(threadId);
    return {
      title: `${thread.title} - Perplexity Clone`,
      description: `Turns: ${thread.turnCount}, sources: ${thread.totalSourceCount}`,
    };
  } catch {
    return {
      title: 'Thread - Perplexity Clone',
    };
  }
}

export default async function Page({ params }: Props) {
  const { threadId } = await params;
  
  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <ThreadPage threadId={threadId} />
    </div>
  );
}
