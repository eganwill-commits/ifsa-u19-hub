'use client';
// "Put it in my calendar": subscribe links for the comp + registration feed.
// Subscriptions auto-update (Apple/Outlook every few hours, Google ~daily).
import { useEffect, useState } from 'react';

export const REGIONS = ['Northern', 'Rockies', 'Intermountain', 'Far West', 'PNW', 'East', 'Western Canada', 'Eastern Canada'];

type Props = {
  /** Followed comp ids. When given (and non-empty), a "My comps" option appears. */
  compIds?: string[];
  compact?: boolean;
};

export default function CalendarSubscribe({ compIds = [], compact = false }: Props) {
  const [host, setHost] = useState('ifsaeventhub.com');
  const [scope, setScope] = useState<'mine' | 'region' | 'all'>(compIds.length ? 'mine' : 'region');
  const [region, setRegion] = useState('Northern');
  const [open, setOpen] = useState(!compact);

  useEffect(() => { setHost(window.location.host); }, []);
  useEffect(() => { if (compIds.length && scope !== 'mine') setScope('mine'); }, [compIds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const qs = scope === 'mine' ? `comps=${compIds.join(',')}` : scope === 'region' ? `region=${encodeURIComponent(region)}` : '';
  const path = `/api/calendar${qs ? '?' + qs : ''}`;
  const webcal = `webcal://${host}${path}`;
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  const download = `https://${host}${path}${qs ? '&' : '?'}download=1`;

  const chip = (active: boolean) => ({
    padding: '5px 12px', borderRadius: 999, border: active ? '1px solid #fff' : '1px solid #2a2a2a',
    background: active ? 'rgba(255,255,255,0.12)' : 'transparent', color: active ? '#fff' : '#aaa', fontSize: 12, cursor: 'pointer', fontWeight: active ? 700 : 400,
  } as const);
  const linkBtn = (primary = false) => ({
    display: 'inline-block', padding: '8px 14px', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 700,
    border: '1px solid #ffcc00', background: primary ? '#ffcc00' : 'transparent', color: primary ? '#000' : '#ffcc00',
  } as const);

  if (compact && !open) {
    return (
      <button onClick={() => setOpen(true)} style={{ ...linkBtn(), cursor: 'pointer', fontFamily: 'inherit' }}>
        📅 Comps + registration deadlines in your calendar
      </button>
    );
  }

  return (
    <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, padding: '16px 18px', background: 'rgba(10,10,10,0.8)' }}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>📅 Calendar + registration reminders</div>
      <div style={{ fontSize: 13, color: '#999', marginBottom: 12, lineHeight: 1.5 }}>
        Subscribe once: comps, registration openings and closing deadlines land in your calendar and stay up to date.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {compIds.length > 0 && <button style={chip(scope === 'mine')} onClick={() => setScope('mine')}>My comps ({compIds.length})</button>}
        <button style={chip(scope === 'region')} onClick={() => setScope('region')}>A region</button>
        <button style={chip(scope === 'all')} onClick={() => setScope('all')}>All comps</button>
      </div>
      {scope === 'region' && (
        <select value={region} onChange={(e) => setRegion(e.target.value)}
          style={{ marginBottom: 12, padding: '8px 10px', borderRadius: 8, background: '#0e0e0e', color: '#fff', border: '1px solid #333', fontSize: 14 }}>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href={webcal} style={linkBtn(true)}>Apple / Outlook</a>
        <a href={google} target="_blank" rel="noreferrer" style={linkBtn()}>Google Calendar</a>
        <a href={download} style={linkBtn()}>Download .ics</a>
      </div>
      <div style={{ fontSize: 11, color: '#777', marginTop: 10, lineHeight: 1.5 }}>
        Reminders: feed events include alerts (24h before registration opens/closes). Some calendar apps
        strip alerts from subscriptions — set a default alert on the subscribed calendar, or use
        “Download .ics”, which keeps them.
        {scope === 'mine' && ' “My comps” is a snapshot of the comps saved in this browser — re-subscribe after adding more.'}
      </div>
    </div>
  );
}
