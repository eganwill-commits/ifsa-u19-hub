'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { unfollow, useFollows } from '@/lib/follows';

type Rank = { athlete_id: string; division: string; place: number | null; points: number | null; place_change: number | null; prev_place: number | null };
type Result = { athlete_id: string; event_name: string | null; place: number | null; event_date: string | null; division: string | null };

const PLACE_COLORS: Record<number, string> = { 1: '#ffcc00', 2: '#d0d0d0', 3: '#cd7f32' };

const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '—';

export default function MyAthletes() {
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const { follows, ready } = useFollows();
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  const ids = useMemo(() => follows.map((f) => f.id), [follows]);
  const idsKey = ids.join(',');

  useEffect(() => {
    if (!ids.length) { setRanks([]); setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [r, res] = await Promise.all([
        supabase.from('rankings_current')
          .select('athlete_id,division,place,points,place_change,prev_place').in('athlete_id', ids),
        supabase.from('event_results')
          .select('athlete_id,event_name,place,event_date,division').in('athlete_id', ids)
          .order('event_date', { ascending: false, nullsFirst: false }).limit(200),
      ]);
      if (cancelled) return;
      setRanks((r.data || []) as Rank[]);
      setResults((res.data || []) as Result[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, supabase]);

  if (!ready) return null;

  if (!follows.length) {
    return (
      <section style={{ border: '1px dashed #2a2a2a', borderRadius: 16, padding: '22px 20px', marginBottom: 28, background: 'rgba(10,10,10,0.5)' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>Your athletes</h2>
        <p style={{ margin: 0, color: '#888', fontSize: 14, lineHeight: 1.5 }}>
          Search for an athlete above, open their profile, and tap <strong style={{ color: '#ffcc00' }}>☆ Follow</strong>.
          They&rsquo;ll show up here with their current ranking and latest results — no account needed.
          Follows are saved in this browser only.
        </p>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>
        Your athletes <span style={{ color: '#555', fontWeight: 400, fontSize: 13 }}>({follows.length})</span>
      </h2>

      <div style={{ display: 'grid', gap: 12 }}>
        {follows.map((f) => {
          const athleteRanks = ranks.filter((r) => r.athlete_id === f.id);
          const recent = results.filter((r) => r.athlete_id === f.id).slice(0, 3);
          return (
            <div key={f.id} style={{ border: '1px solid #2a2a2a', borderRadius: 16, padding: '16px 18px', background: 'rgba(10,10,10,0.8)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <Link href={`/athletes/${f.id}`} style={{ color: '#e8e8e8', textDecoration: 'none', fontSize: 17, fontWeight: 700 }}>
                  {f.name}
                </Link>
                <button
                  onClick={() => unfollow(f.id)}
                  style={{ background: 'transparent', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                  title={`Stop following ${f.name}`}
                >
                  Unfollow
                </button>
              </div>

              {loading && !athleteRanks.length && !recent.length ? (
                <p style={{ color: '#666', fontSize: 13, margin: '10px 0 0' }}>Loading…</p>
              ) : (
                <>
                  {athleteRanks.length > 0 ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0 0' }}>
                      {athleteRanks.map((r) => (
                        <span key={r.division} style={{ border: '1px solid #2a2a2a', borderRadius: 999, padding: '5px 12px', fontSize: 12, color: '#ccc' }}>
                          <span style={{ color: '#777' }}>{r.division}</span>{' '}
                          <strong style={{ color: r.place != null ? PLACE_COLORS[r.place] ?? '#e8e8e8' : '#777' }}>#{r.place ?? '—'}</strong>
                          {r.points != null && <span style={{ color: '#777' }}> · {r.points} pts</span>}
                          {r.place_change != null && r.place_change !== 0 && (
                            <span style={{ color: r.place_change > 0 ? '#4caf50' : '#e05555' }}>
                              {' '}{r.place_change > 0 ? '▲' : '▼'}{Math.abs(r.place_change)}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#666', fontSize: 12, margin: '10px 0 0' }}>Not in the current season rankings yet.</p>
                  )}

                  {recent.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'grid', gap: 6 }}>
                      {recent.map((r, i) => (
                        <li key={i} style={{ fontSize: 13, color: '#aaa', display: 'flex', gap: 10 }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, minWidth: 28, color: r.place != null ? PLACE_COLORS[r.place] ?? '#999' : '#666' }}>
                            {r.place != null ? `${r.place}` : '—'}
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ color: '#ddd' }}>{r.event_name ?? 'Event'}</span>
                            <span style={{ color: '#666' }}> · {fmtDate(r.event_date)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
