'use client';
import { useState } from 'react';

const TABS = [
  { label: 'Ski Men', url: 'https://ifsafreeride.org/u19-ski-men/' },
  { label: 'Ski Women', url: 'https://ifsafreeride.org/u19-ski-women/' },
  { label: 'Snowboard Men', url: 'https://ifsafreeride.org/u19-snowboard-men/' },
  { label: 'Snowboard Women', url: 'https://ifsafreeride.org/u19-snowboard-women/' },
];

export default function RankingsPage() {
  const [active, setActive] = useState(0);
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 60px', fontFamily: 'system-ui', color: '#e8e8e8' }}>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, marginBottom: 4 }}>U19 Rankings</h1>
      <p style={{ color: '#aaa', fontSize: 14, marginBottom: 20 }}>Live rankings sourced from IFSA. Updated after each event.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActive(i)} style={{ padding: '7px 14px', borderRadius: 999, border: active === i ? '1px solid #aaa' : '1px solid #333', background: active === i ? 'rgba(255,255,255,0.1)' : 'transparent', color: active === i ? '#fff' : '#888', fontSize: 'clamp(11px, 3vw, 13px)', cursor: 'pointer', fontWeight: active === i ? 700 : 400 }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, overflow: 'hidden', height: 'clamp(500px, 80vh, 800px)' }}>
        <div style={{ height: '100%', overflow: 'hidden', position: 'relative' }}>
          <iframe
            key={active}
            src={TABS[active].url}
            style={{ width: '100%', height: 1600, border: 'none', background: '#fff', marginTop: -1060 }}
            title={TABS[active].label + ' Rankings'}
          />
        </div>
      </div>
    </main>
  );
}