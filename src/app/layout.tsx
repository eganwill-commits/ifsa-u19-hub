import type { Metadata } from 'next';
import './globals.css';
import Nav from './Nav';
import AskAI from '@/components/AskAI';

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
        <AskAI />
      </body>
    </html>
  );
}
```

---

## Add your Anthropic API key to Vercel

Go to **Vercel dashboard → ifsa-u19-hub → Settings → Environment Variables** and add:
- Key: `ANTHROPIC_API_KEY`
- Value: your Anthropic API key

Also add it to your local `.env.local` file:
```
ANTHROPIC_API_KEY=your_key_here