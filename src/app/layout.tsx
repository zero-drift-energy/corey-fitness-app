import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title: 'COREY FITNESS - Elite Performance Training',
  description: 'AI-powered fitness, nutrition, and recovery tracking for young footballers',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b1326',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh font-body">
        <Header />
        <main className="pb-24 px-4 md:px-6 py-4 max-w-4xl mx-auto">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
