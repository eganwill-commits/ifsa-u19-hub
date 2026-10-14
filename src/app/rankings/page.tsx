'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

type RankRow = {
  athlete_id: string | null;
  athlete_name: string;
  place: number | null;
  points: number | null;
  snapshot_date: string | null;
  series_name: string | null;
  prev_place: number | null;
  place_change: number | null;
};

// IFSA ranks U15 and U19 only. U12 competes but has no season standings in any
// LiveHeats series, so there is deliberately no U12 tab here.
const AGE_GROUPS = ['U19', 'U15'];
const CATEGORIES = [
  { label: 'Ski Men', discipline: 'Ski', gender: 'Men' },
  { label: 'Ski Women', discipline: 'Ski', gender: 'Women' },
  { label: 'Snowboard Men', discipline: 'Snowboard', gender: 'Men' },
  { label: 'Snowboard Women', discipline: 'Snowboard', gender: 'Women' },
];

const PLACE_COLORS: Record<number, string> = { 1: '#ffcc00', 2: '#d0d0d0', 3: '#cd7f32' };
const PAGE_SIZE = 100;

function Movement({ change, prevPlace }: { change: number | null; prevPlace: number | null }) {
  if (prevPlace == null) {
    return <span style={{ color: '#4a9edd', fontSize: 11, fontFamily: 'monospace' }} title="New to these rankings">NEW</span>;
  }
  if (change == null || change === 0) {
    return <span style={{ color: '#555', fontFamily: 'monospace' }} title="No change">–</span>;
  }
  const up = change > 0;
  return (
    <span
      style={{ color: up ? '#4caf50' : '#e05555', fontFamily: 'monospace', fontSize: 12 }}
      title={`${up ? 'Up' : 'Down'} ${Math.abs(change)} since last update`}
    >
      {up ? '▲' : '▼'} {Math.abs(change)}
    </span>
  );
}

export default function RankingsPage() {
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [ageIdx, setAgeIdx] = useState(0);
  const [catIdx, setCatIdx] = useState(0);
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const division = `${AGE_GROUPS[ageIdx]} ${CATEGORIES[catIdx].discipline} ${CATEGORIES[catIdx].gender}`;
  const officialUrl = `https://ifsafreeride.org/${AGE_GROUPS[ageIdx].toLowerCase()}-${CATEGORIES[catIdx].discipline.toLowerCase()}-${CATEGORIES[catIdx].gender.toLowerCase()}/`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setVisible(PAGE_SIZE);
    (async () => {
      const { data } = await supabase
        .from('rankings_current')
        .select('athlete_id, athlete_name, place, points, snapshot_date, series_name, prev_place, place_change')
        .eq('division', division)
        .order('place', { ascending: true, nullsFirst: false })
        .limit(1000);
      if (!cancelled) {
        setRows((data || []) as RankRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [division, supabase]);

  // Reset how many rows are shown whenever the search changes.
  useEffect(() => { setVisible(PAGE_SIZE); }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.athlete_name?.toLowerCase().includes(q));
  }, [rows, query]);

  const shown = filtered.slice(0, visible);
  const seasonName = rows[0]?.series_name ?? null;
  const hasMovement = rows.some((r) => r.prev_place != null);
  const updated = rows[0]?.snapshot_date
    ? new Date(rows[0].snapshot_date + 'T00:00:00Z').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
      })
    : null;

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 60px', fontFamily: 'system-ui', color: '#e8e8e8' }}>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, marginBottom: 4 }}>Rankings</h1>
      <p style={{ color: '#aaa', fontSize: 14, marginBottom: 20 }}>
        {seasonName ? <strong style={{ color: '#e8e8e8' }}>{seasonName}</strong> : 'Season standings'} from LiveHeats.
        {updated ? ` Updated ${updated}.` : ''}{' '}
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

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search this division by athlete name…"
        aria-label="Search rankings by athlete name"
        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', marginBottom: 16, borderRadius: 10, border: '1px solid #2a2a2a', background: 'rgba(10,10,10,0.8)', color: '#e8e8e8', fontSize: 15, fontFamily: 'inherit' }}
      />

      <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, overflow: 'hidden', background: 'rgba(10,10,10,0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #2a2a2a', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{division}</h2>
          {!loading && (
            <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>
              {query ? `${filtered.length} of ${rows.length}` : `${rows.length} athletes`}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '32px 20px', color: '#aaa', fontSize: 14 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#777', fontSize: 13 }}>
            No ranking data for this category yet. Standings appear once the season&rsquo;s first results are scored.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#777', fontSize: 13 }}>
            No athlete in {division} matches &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#555', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 20px', width: 60 }}>Rank</th>
                    {hasMovement && <th style={{ padding: '8px 10px', width: 64 }}>Move</th>}
                    <th style={{ padding: '8px 20px' }}>Athlete</th>
                    <th style={{ padding: '8px 20px', width: 90, textAlign: 'right' }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r, i) => {
                    const color = r.place != null ? PLACE_COLORS[r.place] ?? '#e8e8e8' : '#777';
                    return (
                      <tr key={`${r.athlete_id ?? r.athlete_name}-${i}`} style={{ borderTop: '1px solid #1e1e1e' }}>
                        <td style={{ padding: '10px 20px', fontWeight: 800, fontFamily: 'monospace', color }}>{r.place ?? '—'}</td>
                        {hasMovement && (
                          <td style={{ padding: '10px 10px' }}>
                            <Movement change={r.place_change} prevPlace={r.prev_place} />
                          </td>
                        )}
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

            {visible < filtered.length && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid #1e1e1e', textAlign: 'center' }}>
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  style={{ padding: '9px 22px', borderRadius: 999, border: '1px solid #333', background: 'transparent', color: '#e8e8e8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
                  <span style={{ color: '#777' }}> ({filtered.length - visible} left)</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
