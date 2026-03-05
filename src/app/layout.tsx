import type { Metadata } from 'next';
import './globals.css';
import Nav from './Nav';

export const metadata: Metadata = {
  title: 'IFSA Event Hub',
  description: 'IFSA U19 Freeride Events and Results',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh' }}>
        <Nav />
        {children}
      </body>
    </html>
  );
}