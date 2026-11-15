import type { Metadata, Viewport } from 'next';
import './globals.css';
import Nav from './Nav';
import AskAI from '@/components/AskAI';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  metadataBase: new URL('https://ifsaeventhub.com'),
  title: 'IFSA Event Hub',
  description: 'Freeride competition events for U12, U15, and U19 athletes',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'IFSA Hub',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0e0e0e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh' }}>
        <Nav />
        {children}
        <AskAI />
        <Analytics />
      </body>
    </html>
  );
}
