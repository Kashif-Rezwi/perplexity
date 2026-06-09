import { Sidebar } from '@/features/sidebar/Sidebar';

type Props = {
  children: React.ReactNode;
};

export function MainLayout({ children }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto flex flex-col relative">
        <div className="max-w-[768px] w-full mx-auto px-4 md:px-6 lg:px-12 flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
