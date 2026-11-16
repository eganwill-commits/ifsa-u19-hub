import type { Metadata, Viewport } from 'next';

// Unlisted walkthrough video. Not linked from the nav or anywhere on the site,
// and kept out of search engines. Share the URL directly: ifsaeventhub.com/howtouse
// The player is a fixed full-screen layer, so on a phone the video fills the
// screen (it covers the site nav and the Ask AI button on this page only).
export const metadata: Metadata = {
  title: 'How to use · IFSA Event Hub',
  description: 'A two-minute walkthrough of the IFSA Event Hub: events, follows, calendar sync, weather, rankings, athlete profiles, points, rules and Ask AI.',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  openGraph: {
    title: 'How to use the IFSA Event Hub',
    description: 'A two-minute walkthrough of the IFSA Event Hub.',
    url: '/howtouse',
    images: [{ url: '/howtouse/poster.jpg', width: 720, height: 1280 }],
    videos: [{ url: '/howtouse/ifsa-event-hub-walkthrough.mp4', type: 'video/mp4', width: 1080, height: 1920 }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function HowToUsePage() {
  return (
    <main style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video
        src="/howtouse/ifsa-event-hub-walkthrough.mp4"
        poster="/howtouse/poster.jpg"
        controls
        playsInline
        preload="metadata"
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block' }}
      />
      <a
        href="/"
        style={{
          position: 'absolute', top: 'calc(10px + env(safe-area-inset-top))', right: 'calc(10px + env(safe-area-inset-right))',
          padding: '7px 12px', borderRadius: 999, background: 'rgba(255,204,0,0.92)', color: '#111',
          fontFamily: 'system-ui', fontSize: 13, fontWeight: 800, textDecoration: 'none',
        }}
      >
        Open the Hub →
      </a>
    </main>
  );
}
