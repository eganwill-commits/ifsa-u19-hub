'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

type RankRow = {
  athlete_id: string | null;
  athlete_name: string;
  place: number | null;
  points: number | null;
  updated_at: string | null;
};

const AGE_GROUPS = ['U19', 'U15'];
const CATEGORIES = [
  { label: 'Ski Men', discipline: 'Ski', gender: 'Men' },
  { label: 'Ski Women', discipline: 'Ski', gender: 'Women' },
  { label: 'Snowboard Men', discipline: 'Snowboard', gender: 'Men' },
  { label: 'Snowboard Women', discipline: 'Snowboard', gender: 'Women' },
];

const PLACE_COLORS: Record<number, string> = { 1: '#ffcc00', 2: '#d0d0d0', 3: '#cd7f32' };

export default function RankingsPage() {
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [ageIdx, setAgeIdx] = useState(0);
  const [catIdx, setCatIdx] = useState(0);
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);

  const division = `${AGE_GROUPS[ageIdx]} ${CATEGORIES[catIdx].discipline} ${CATEGORIES[catIdx].gender}`;
  const officialUrl = `https://ifsafreeride.org/${AGE_GROUPS[ageIdx].toLowerCase()}-${CATEGORIES[catIdx].discipline.toLowerCase()}-${CATEGORIES[catIdx].gender.toLowerCase()}/`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('rankings_snapshots')
        .select('athlete_id, athlete_name, place, points, updated_at')
        .eq('division', division)
        .order('place', { ascending: true, nullsFirst: false })
        .limit(500);
      if (!cancelled) {
        setRows((data || []) as RankRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [division, supabase]);

  const updated = rows[0]?.updated_at
    ? new Date(rows[0].updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : null;

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 60px', fontFamily: 'system-ui', color: '#e8e8e8' }}>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, marginBottom: 4 }}>Rankings</h1>
      <p style={{ color: '#aaa', fontSize: 14, marginBottom: 20 }}>
        Season standings from LiveHeats.{updated ? ` Updated ${updated}.` : ''}{' '}
        <a href={officialUrl} target="_blank" rel="noreferrer" style={{ color: '#ffcc00', textDecoration: 'none' }}>
          Official IFSA rankings ↗
        </a>
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {AGE_GROUPS.map((g, i) => (
          <button key={g} onClick={() => setAgeIdx(i)} style={{ padding: '7px 20px', borderRadius: 999, border: ageIdx === i ? '1px solid #ffcc00' : '1px solid #333', background: ageIdx === i ? '#ffcc00' : 'transparent', color: ageIdx === i ? '#000' : '#888', fontSize: 14, cursor: 'pointer', fontWeight: ageIdx === i ? 700 : 400 }}>
            {g}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {CATEGORIES.map((c, i) => (
          <button key={c.label} onClick={() => setCatIdx(i)} style={{ padding: '7px 14px', borderRadius: 999, border: catIdx === i ? '1px solid #aaa' : '1px solid #333', background: catIdx === i ? 'rgba(255,255,255,0.1)' : 'transparent', color: catIdx === i ? '#fff' : '#888', fontSize: 'clamp(11px, 3vw, 13px)', cursor: 'pointer', fontWeight: catIdx === i ? 700 : 400 }}>
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, overflow: 'hidden', background: 'rgba(10,10,10,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #2a2a2a' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{division}</h2>
          {!loading && <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{rows.length} athletes</span>}
        </div>

        {loading ? (
          <div style={{ padding: '32px 20px', color: '#aaa', fontSize: 14 }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#777', fontSize: 13 }}>No ranking data for this category yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#555', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 20px', width: 60 }}>Rank</th>
                  <th style={{ padding: '8px 20px' }}>Athlete</th>
                  <th style={{ padding: '8px 20px', width: 90, textAlign: 'right' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const color = r.place != null ? PLACE_COLORS[r.place] ?? '#e8e8e8' : '#777';
                  return (
                    <tr key={`${r.athlete_id ?? r.athlete_name}-${i}`} style={{ borderTop: '1px solid #1e1e1e' }}>
                      <td style={{ padding: '10px 20px', fontWeight: 800, fontFamily: 'monospace', color }}>{r.place ?? '—'}</td>
                      <td style={{ padding: '10px 20px', fontWeight: 600 }}>
                        {r.athlete_id ? (
                          <Link href={`/athletes/${r.athlete_id}`} style={{ color: '#e8e8e8', textDecoration: 'none' }}>{r.athlete_name}</Link>
                        ) : (
                          r.athlete_name
                        )}
                      </td>
                      <td style={{ padding: '10px 20px', textAlign: 'right', color: '#aaa', fontFamily: 'monospace' }}>{r.points ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
