import type { Metadata } from 'next';

// Unlisted walkthrough video. Not linked from the nav or anywhere on the site,
// and kept out of search engines. Share the URL directly: ifsaeventhub.com/howtouse
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

export default function HowToUsePage() {
  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 60px', fontFamily: 'system-ui', color: '#e8e8e8' }}>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, margin: '0 0 4px' }}>How to use the Event Hub</h1>
      <p style={{ color: '#aaa', fontSize: 14, margin: '0 0 14px' }}>
        Two minutes on everything the IFSA Event Hub does. Turn your sound on.
      </p>
      <video
        src="/howtouse/ifsa-event-hub-walkthrough.mp4"
        poster="/howtouse/poster.jpg"
        controls
        playsInline
        preload="metadata"
        style={{ width: '100%', aspectRatio: '9 / 16', borderRadius: 18, background: '#000', display: 'block', border: '1px solid #2a2a2a' }}
      />
      <a
        href="/"
        style={{ display: 'block', textAlign: 'center', marginTop: 16, padding: '12px 16px', borderRadius: 12, background: '#ffcc00', color: '#111', fontWeight: 800, textDecoration: 'none' }}
      >
        Open the Event Hub →
      </a>
    </main>
  );
}
