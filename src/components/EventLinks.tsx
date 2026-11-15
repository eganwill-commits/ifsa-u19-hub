'use client';
// Everything a parent needs to act on for one comp: registration window + every
// external link we know about (IFSA, LiveHeats, event guide, venue, directions,
// organizer contact, calendar). Client component so times render in the
// viewer's own time zone.
import { registrationInfo, fmtRegTime } from '@/lib/registration';

type Props = {
  name: string;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  ifsaUrl: string | null;
  liveheatsUrl: string | null;
  eventGuideUrl: string | null;
  venueName: string | null;
  venueWebsite: string | null;
  streetAddress: string | null;
  locationText: string | null;
  lat: number | null;
  lon: number | null;
  contactEmail: string | null;
  region: string | null;
  registrationOpens: string | null;
  registrationCloses: string | null;
};

const ymdCompact = (ymd: string) => ymd.replace(/-/g, '');
const addDay = (ymd: string) => {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function EventLinks(p: Props) {
  const finished = p.status === 'completed' || p.status === 'cancelled';
  const reg = finished ? null : registrationInfo(p.registrationOpens, p.registrationCloses);

  const address = [p.streetAddress, p.locationText].filter(Boolean).join(', ');
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.venueName ? p.venueName + ', ' : '') + address)}`
    : p.lat != null && p.lon != null
      ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`
      : null;

  const calUrl = !finished && p.startDate
    ? 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + `&text=${encodeURIComponent(p.name)}`
      + `&dates=${ymdCompact(p.startDate)}/${ymdCompact(addDay(p.endDate ?? p.startDate))}`
      + (address ? `&location=${encodeURIComponent(address)}` : '')
      + `&details=${encodeURIComponent([p.ifsaUrl, p.liveheatsUrl].filter(Boolean).join('\n'))}`
    : null;

  const links: { label: string; sub: string; href: string; primary?: boolean }[] = [];
  if (p.eventGuideUrl) links.push({ label: 'Event Guide', sub: 'Schedule, fees, caps, venue info', href: p.eventGuideUrl, primary: true });
  if (p.liveheatsUrl) links.push({
    label: 'LiveHeats',
    sub: finished ? 'Official results' : 'Entries, heats & live scores',
    href: p.liveheatsUrl,
  });
  if (p.ifsaUrl) links.push({ label: 'IFSA event page', sub: 'Official listing', href: p.ifsaUrl });
  if (p.venueWebsite) links.push({ label: p.venueName ? `${p.venueName} website` : 'Venue website', sub: 'Lift tickets, lodging, conditions', href: p.venueWebsite });
  if (mapsUrl) links.push({ label: 'Directions', sub: address || 'Google Maps', href: mapsUrl });
  if (p.contactEmail) links.push({ label: 'Contact organizer', sub: p.region ? `${p.region} region · ${p.contactEmail}` : p.contactEmail, href: `mailto:${p.contactEmail}` });
  if (calUrl) links.push({ label: 'Add to calendar', sub: 'Google Calendar', href: calUrl });

  if (!reg && links.length === 0) return null;

  const regColor = reg?.state === 'open' ? '#4caf50' : reg?.state === 'not_yet' ? '#4a9edd' : '#888';

  return (
    <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, padding: 20, marginBottom: 16, background: 'rgba(10,10,10,0.8)' }}>
      <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Registration &amp; links</h2>

      {reg && (
        <div style={{ border: `1px solid ${regColor}`, borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, color: regColor, fontWeight: 800, marginBottom: 4 }}>
              {reg.state === 'open' ? 'REGISTRATION OPEN' : reg.state === 'not_yet' ? 'REGISTRATION NOT OPEN YET' : 'REGISTRATION CLOSED'}
            </div>
            <div style={{ fontSize: 13, color: '#ddd' }}>
              Opens {fmtRegTime(reg.opens)} · Closes {fmtRegTime(reg.closes)}
            </div>
            <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>
              Times shown in your time zone. IFSA + regional memberships must be active before you can enter.
            </div>
          </div>
          {p.liveheatsUrl && reg.state !== 'closed' && (
            <a href={p.liveheatsUrl} target="_blank" rel="noreferrer"
              style={{ fontSize: 14, fontWeight: 800, color: '#000', background: reg.state === 'open' ? '#ffcc00' : '#555', borderRadius: 10, padding: '10px 16px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {reg.state === 'open' ? 'Register on LiveHeats ↗' : 'Registration page ↗'}
            </a>
          )}
        </div>
      )}

      {links.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {links.map((l) => (
            <a key={l.label} href={l.href} target={l.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer"
              style={{ display: 'block', border: `1px solid ${l.primary ? '#ffcc00' : '#2a2a2a'}`, borderRadius: 10, padding: '10px 12px', textDecoration: 'none', color: '#e8e8e8', background: 'rgba(0,0,0,0.3)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: l.primary ? '#ffcc00' : '#e8e8e8' }}>{l.label} {l.href.startsWith('mailto:') ? '✉' : '↗'}</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.sub}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
