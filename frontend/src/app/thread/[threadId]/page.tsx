import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { ThreadPage } from '@/features/thread/components/ThreadPage';
import { getThread } from '@/lib/api/threads.api';
import { queryClientConfig } from '@/lib/api/queryClientConfig';
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
  const queryClient = new QueryClient(queryClientConfig);

  await queryClient.prefetchQuery({
    queryKey: ['thread', threadId],
    queryFn: () => getThread(threadId),
  });
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="w-full h-full flex flex-col overflow-hidden">
        <ThreadPage threadId={threadId} />
      </div>
    </HydrationBoundary>
  );
}
