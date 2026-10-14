'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

type AthleteHit = { id: string; name: string };
type EventHit = { id: string; name: string; start_date: string | null; venue_name: string | null };

export default function GlobalSearch() {
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [query, setQuery] = useState('');
  const [athletes, setAthletes] = useState<AthleteHit[]>([]);
  const [events, setEvents] = useState<EventHit[]>([]);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setAthletes([]); setEvents([]); setSearching(false);
      return;
    }
    setSearching(true);
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      const pattern = `%${q.replace(/[%_]/g, '')}%`;
      const [a, e] = await Promise.all([
        supabase.from('athletes').select('id,name').ilike('name', pattern).order('name').limit(6),
        supabase.from('ifsa_events').select('id,name,start_date,venue_name').ilike('name', pattern)
          .order('start_date', { ascending: false, nullsFirst: false }).limit(12),
      ]);
      if (seq.current !== mine) return; // a newer keystroke already won
      setAthletes((a.data || []) as AthleteHit[]);
      // ifsa_events carries one row per division; collapse to one card per competition.
      const seen = new Set<string>();
      const uniqueEvents = ((e.data || []) as EventHit[]).filter((ev) => {
        if (seen.has(ev.name)) return false;
        seen.add(ev.name);
        return true;
      }).slice(0, 6);
      setEvents(uniqueEvents);
      setSearching(false);
    }, 220);
    return () => clearTimeout(timer);
  }, [query, supabase]);

  const showPanel = query.trim().length >= 2;
  const nothing = showPanel && !searching && athletes.length === 0 && events.length === 0;

  return (
    <div style={{ marginBottom: 28 }}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search athletes and events…"
        aria-label="Search athletes and events"
        style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 12, border: '1px solid #2a2a2a', background: 'rgba(10,10,10,0.8)', color: '#e8e8e8', fontSize: 16, fontFamily: 'inherit' }}
      />

      {showPanel && (
        <div style={{ marginTop: 8, border: '1px solid #2a2a2a', borderRadius: 12, background: 'rgba(10,10,10,0.95)', overflow: 'hidden' }}>
          {searching && <div style={{ padding: '14px 16px', color: '#777', fontSize: 13 }}>Searching…</div>}

          {!searching && athletes.length > 0 && (
            <>
              <div style={{ padding: '10px 16px 6px', color: '#555', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}>Athletes</div>
              {athletes.map((a) => (
                <Link key={a.id} href={`/athletes/${a.id}`} style={{ display: 'block', padding: '10px 16px', color: '#e8e8e8', textDecoration: 'none', borderTop: '1px solid #1a1a1a', fontSize: 14, fontWeight: 600 }}>
                  {a.name}
                </Link>
              ))}
            </>
          )}

          {!searching && events.length > 0 && (
            <>
              <div style={{ padding: '10px 16px 6px', color: '#555', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', borderTop: athletes.length ? '1px solid #1a1a1a' : undefined }}>Events</div>
              {events.map((ev) => (
                <Link key={ev.id} href={`/events/${ev.id}`} style={{ display: 'block', padding: '10px 16px', color: '#e8e8e8', textDecoration: 'none', borderTop: '1px solid #1a1a1a', fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{ev.name}</span>
                  {ev.start_date && (
                    <span style={{ color: '#777', fontSize: 12, marginLeft: 8 }}>
                      {new Date(ev.start_date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                      {ev.venue_name ? ` · ${ev.venue_name}` : ''}
                    </span>
                  )}
                </Link>
              ))}
            </>
          )}

          {nothing && <div style={{ padding: '14px 16px', color: '#777', fontSize: 13 }}>Nothing matches &ldquo;{query.trim()}&rdquo;.</div>}
        </div>
      )}
    </div>
  );
}
