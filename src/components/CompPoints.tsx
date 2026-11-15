// "What it's worth": points on offer at this comp, from the rulebook table.
import Link from 'next/link';
import { basePoints, tierFromStars } from '@/lib/points';

export default function CompPoints({ stars, division }: { stars: number | null; division: string | null }) {
  if (division === 'U12') {
    return (
      <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, padding: '14px 20px', marginBottom: 16, background: 'rgba(10,10,10,0.8)', fontSize: 13, color: '#aaa' }}>
        <b style={{ color: '#e8e8e8' }}>U12 is unranked:</b> no points or seeding — it’s about fun and progression. <Link href="/points" style={{ color: '#ffcc00' }}>How the season works →</Link>
      </div>
    );
  }
  const tier = tierFromStars(stars);
  if (!tier) return null;
  const places = [1, 2, 3, 5, 10, 20];
  return (
    <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, padding: '14px 20px', marginBottom: 16, background: 'rgba(10,10,10,0.8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Points on offer · {stars}★</h2>
        <Link href="/points" style={{ fontSize: 12, color: '#ffcc00' }}>How points & JFC qualification work →</Link>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {places.map((p) => (
          <div key={p} style={{ border: '1px solid #222', borderRadius: 10, padding: '6px 10px', minWidth: 64, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#777' }}>{p === 1 ? '1st' : p === 2 ? '2nd' : p === 3 ? '3rd' : `${p}th`}</div>
            <div style={{ fontWeight: 800, color: p <= 3 ? '#ffcc00' : '#e8e8e8' }}>{basePoints(tier, p)}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>Base points, plus 1 for every athlete beaten. Counts as one of your 4 point events{tier === '3' ? ' and one of your max three 3★s' : ''}.</div>
    </div>
  );
}
