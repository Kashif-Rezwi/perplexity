import type { Metadata } from 'next';
import { HistoryPage } from '@/features/history/components/HistoryPage';

export const metadata: Metadata = {
  title: 'History - Perplexity Clone',
  description: 'Browse previous Perplexity Clone conversations.',
};

export default function Page() {
  return <HistoryPage />;
}
