'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import GlobalSearch from '@/components/GlobalSearch';
import MyAthletes from '@/components/MyAthletes';

type EventRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  location_text: string | null;
  stars: number | null;
};

const fmtRange = (start: string | null, end: string | null) => {
  if (!start) return 'Date TBD';
  const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' } as const;
  const s = new Date(start + 'T00:00:00Z').toLocaleDateString('en-US', opts);
  if (!end || end === start) return s;
  const e = new Date(end + 'T00:00:00Z').toLocaleDateString('en-US', opts);
  return `${s} – ${e}`;
};

export default function HomePage() {
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [upcoming, setUpcoming] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('ifsa_events')
        .select('id,name,start_date,end_date,venue_name,location_text,stars')
        .gte('start_date', today)
        .order('start_date', { ascending: true })
        .limit(40);
      if (cancelled) return;
      // One row per division in the table; show one card per competition.
      const seen = new Set<string>();
      const unique = ((data || []) as EventRow[]).filter((e) => {
        if (seen.has(e.name)) return false;
        seen.add(e.name);
        return true;
      }).slice(0, 6);
      setUpcoming(unique);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '28px 16px 60px', fontFamily: 'system-ui', color: '#e8e8e8' }}>
      <h1 style={{ fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 800, margin: '0 0 6px' }}>
        IFSA Junior Freeride Hub
      </h1>
      <p style={{ color: '#888', fontSize: 15, margin: '0 0 24px' }}>
        Events, results, rankings and athletes for U12, U15 and U19 — in one place.
      </p>

      <GlobalSearch />
      <MyAthletes />

      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Next events</h2>
          <Link href="/events" style={{ color: '#ffcc00', textDecoration: 'none', fontSize: 13 }}>All events →</Link>
        </div>

        {loading ? (
          <p style={{ color: '#666', fontSize: 14 }}>Loading…</p>
        ) : upcoming.length === 0 ? (
          <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, padding: '20px', background: 'rgba(10,10,10,0.8)' }}>
            <p style={{ margin: 0, color: '#888', fontSize: 14, lineHeight: 1.5 }}>
              No upcoming events loaded yet. The season calendar appears here once the next
              data sync runs. In the meantime, <Link href="/events" style={{ color: '#ffcc00' }}>browse past events</Link> or
              check the <a href="https://ifsafreeride.org/events/" target="_blank" rel="noreferrer" style={{ color: '#ffcc00' }}>official IFSA calendar ↗</a>.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {upcoming.map((e) => (
              <Link key={e.id} href={`/events/${e.id}`} style={{ display: 'block', border: '1px solid #2a2a2a', borderRadius: 14, padding: '14px 16px', background: 'rgba(10,10,10,0.8)', textDecoration: 'none', color: '#e8e8e8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 650, fontSize: 15 }}>{e.name}</span>
                  {e.stars != null && <span style={{ color: '#ffcc00', fontSize: 13, whiteSpace: 'nowrap' }}>{e.stars}★</span>}
                </div>
                <div style={{ color: '#777', fontSize: 13, marginTop: 4 }}>
                  {fmtRange(e.start_date, e.end_date)}
                  {(e.venue_name || e.location_text) ? ` · ${e.venue_name ?? e.location_text}` : ''}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
