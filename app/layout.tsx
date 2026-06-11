import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/components/theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Feed Cooperative',
  description: 'Feed cooperative transaction ledger',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-900 min-h-screen`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
