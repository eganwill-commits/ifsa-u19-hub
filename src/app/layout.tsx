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
    // favicon.ico comes from src/app/favicon.ico (Next file convention)
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
