import type { Metadata } from 'next';
import './globals.css';
import Nav from './Nav';
import AskAI from '@/components/AskAI';

export const metadata: Metadata = {
  title: 'IFSA Event Hub',
  description: 'Freeride competition events for U12, U15, and U19 athletes',
  manifest: '/manifest.json',
  themeColor: '#0e0e0e',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh' }}>
        <Nav />
        {children}
        <AskAI />
      </body>
    </html>
  );
}
