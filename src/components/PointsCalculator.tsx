'use client';
import { useState } from 'react';
import { pointsFor, basePoints, type Tier } from '@/lib/points';

const TIERS: { v: Tier; label: string }[] = [
  { v: '2', label: '2★' },
  { v: '3', label: '3★' },
  { v: 'JFC', label: 'JFC' },
];

export default function PointsCalculator() {
  const [tier, setTier] = useState<Tier>('2');
  const [place, setPlace] = useState(5);
  const [field, setField] = useState(30);

  const p = Math.max(1, Math.min(place, field || place));
  const total = pointsFor(tier, p, field || null);
  const base = basePoints(tier, p);

  const btn = (active: boolean) => ({
    padding: '6px 14px', borderRadius: 999, border: active ? '1px solid #ffcc00' : '1px solid #2a2a2a',
    background: active ? '#ffcc00' : 'transparent', color: active ? '#000' : '#ccc', fontWeight: 700, cursor: 'pointer', fontSize: 13,
  } as const);
  const num = { width: 80, padding: '8px 10px', borderRadius: 8, border: '1px solid #333', background: '#0e0e0e', color: '#fff', fontSize: 15 } as const;

  return (
    <div style={{ border: '1px solid #ffcc00', borderRadius: 16, padding: 18, background: 'rgba(255,204,0,0.05)' }}>
      <div style={{ fontWeight: 800, marginBottom: 12 }}>Points calculator</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TIERS.map((t) => <button key={t.v} onClick={() => setTier(t.v)} style={btn(tier === t.v)}>{t.label}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ fontSize: 12, color: '#aaa' }}>Finish<br />
          <input type="number" min={1} value={place} onChange={(e) => setPlace(Number(e.target.value) || 1)} style={num} />
        </label>
        <label style={{ fontSize: 12, color: '#aaa' }}>Athletes in division<br />
          <input type="number" min={1} value={field} onChange={(e) => setField(Number(e.target.value) || 0)} style={num} />
        </label>
        <div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#ffcc00', lineHeight: 1 }}>{total.toLocaleString()} pts</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            {tier === '3' && field <= 2 ? 'Small-field 3★ rule applied' : `${base} base + ${Math.max((field || 0) - p, 0)} for athletes beaten`}
          </div>
        </div>
      </div>
    </div>
  );
}
