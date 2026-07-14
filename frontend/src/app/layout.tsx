import type { Metadata } from "next";
import { AppQueryClientProvider } from "@/providers/QueryClientProvider";
import { MainLayout } from "@/components/MainLayout/MainLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perplexity Clone",
  description: "AI answer engine frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body>
        <AppQueryClientProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </AppQueryClientProvider>
      </body>
    </html>
  );
}
