'use client';
// Home-page "Your comps": saved comps with registration status, plus the calendar feed.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { unfollowComp, useCompFollows } from '@/lib/compFollows';
import { registrationInfo, regBadgeLabel } from '@/lib/registration';
import CalendarSubscribe from './CalendarSubscribe';

type Row = { id: string; name: string; start_date: string | null; end_date: string | null; venue_name: string | null; status: string | null; registration_opens: string | null; registration_closes: string | null };

const fmt = (d: string | null) => d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : 'TBD';

export default function MyComps() {
  const supabase = useMemo(() => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);
  const { follows, ready } = useCompFollows();
  const [rows, setRows] = useState<Row[]>([]);
  const ids = follows.map((f) => f.id);
  const key = ids.join(',');

  useEffect(() => {
    if (!ids.length) { setRows([]); return; }
    let cancelled = false;
    supabase.from('ifsa_events')
      .select('id,name,start_date,end_date,venue_name,status,registration_opens,registration_closes')
      .in('id', ids)
      .then(({ data }) => { if (!cancelled) setRows((data || []) as Row[]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, supabase]);

  if (!ready) return null;

  if (!follows.length) {
    return (
      <section style={{ marginBottom: 28 }}>
        <div style={{ border: '1px dashed #2a2a2a', borderRadius: 16, padding: '18px 20px', marginBottom: 12, background: 'rgba(10,10,10,0.5)' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>Your comps</h2>
          <p style={{ margin: 0, color: '#888', fontSize: 14, lineHeight: 1.5 }}>
            Open any event and tap <strong style={{ color: '#ffcc00' }}>☆ Add to my comps</strong> to track registration windows here
            and get them in your calendar.
          </p>
        </div>
        <CalendarSubscribe compact />
      </section>
    );
  }

  const sorted = [...rows].sort((a, b) => (a.start_date ?? '9').localeCompare(b.start_date ?? '9'));

  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>
        Your comps <span style={{ color: '#555', fontWeight: 400, fontSize: 13 }}>({follows.length})</span>
      </h2>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        {sorted.map((r) => {
          const reg = r.status === 'completed' ? null : registrationInfo(r.registration_opens, r.registration_closes);
          const color = reg?.state === 'open' ? '#4caf50' : reg?.state === 'not_yet' ? '#4a9edd' : '#777';
          return (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, border: '1px solid #2a2a2a', borderRadius: 14, padding: '12px 14px', background: 'rgba(10,10,10,0.8)' }}>
              <Link href={`/events/${r.id}`} style={{ textDecoration: 'none', color: '#e8e8e8', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {fmt(r.start_date)}{r.end_date && r.end_date !== r.start_date ? ` – ${fmt(r.end_date)}` : ''}{r.venue_name ? ` · ${r.venue_name}` : ''}
                  {reg && <span style={{ color, fontWeight: 700 }}> · {regBadgeLabel(reg)}</span>}
                  {r.status === 'completed' && <span style={{ color: '#4caf50' }}> · Results posted</span>}
                </div>
              </Link>
              <button onClick={() => unfollowComp(r.id)} title="Remove" aria-label={`Remove ${r.name}`}
                style={{ background: 'none', border: 'none', color: '#555', fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>
          );
        })}
      </div>
      <CalendarSubscribe compIds={ids} compact />
    </section>
  );
}
