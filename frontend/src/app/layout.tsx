import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppQueryClientProvider } from "@/providers/QueryClientProvider";
import { MainLayout } from "@/components/MainLayout/MainLayout";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

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
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
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
