// Minimal iCalendar (RFC 5545) writer for comp + registration-window events.

export type CompForCal = {
  key: string; // stable per comp (ifsa_url)
  name: string;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  location_text: string | null;
  street_address: string | null;
  registration_opens: string | null;
  registration_closes: string | null;
  liveheats_url: string | null;
  ifsa_url: string | null;
  event_guide_url: string | null;
  hub_url: string;
  divisions: string[];
};

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
const ymd = (d: string) => d.replace(/-/g, '');
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const addDays = (d: string, n: number) => {
  const x = new Date(d + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
// Stable, short UID fragment from the comp key.
const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

// Lines must be folded at 75 octets.
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length) { parts.push(' ' + rest.slice(0, 73)); rest = rest.slice(73); }
  return parts.join('\r\n');
}

function alarm(trigger: string, text: string): string[] {
  return ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(text)}`, `TRIGGER:${trigger}`, 'END:VALARM'];
}

export function buildCalendar(comps: CompForCal[], calName: string, opts: { alarms: boolean }): string {
  const now = stamp(new Date().toISOString());
  const L: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//IFSA Event Hub//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(calName)}`, 'X-WR-TIMEZONE:America/Denver',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H',
  ];
  for (const c of comps) {
    const id = hash(c.key);
    const where = [c.venue_name, c.street_address, c.location_text].filter(Boolean).join(', ');
    const links = [
      `Hub: ${c.hub_url}`,
      c.liveheats_url && `LiveHeats (register/results): ${c.liveheats_url}`,
      c.event_guide_url && `Event Guide: ${c.event_guide_url}`,
      c.ifsa_url && `IFSA: ${c.ifsa_url}`,
    ].filter(Boolean).join('\n');
    const divs = c.divisions.length ? ` (${c.divisions.join('/')})` : '';

    if (c.start_date) {
      L.push('BEGIN:VEVENT', `UID:comp-${id}@ifsaeventhub.com`, `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${ymd(c.start_date)}`, `DTEND;VALUE=DATE:${ymd(addDays(c.end_date ?? c.start_date, 1))}`,
        `SUMMARY:${esc(c.name + divs)}`, `LOCATION:${esc(where)}`, `DESCRIPTION:${esc(links)}`, `URL:${c.hub_url}`,
        'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
    if (c.registration_opens) {
      L.push('BEGIN:VEVENT', `UID:regopen-${id}@ifsaeventhub.com`, `DTSTAMP:${now}`,
        `DTSTART:${stamp(c.registration_opens)}`, `DTEND:${stamp(new Date(Date.parse(c.registration_opens) + 30 * 60000).toISOString())}`,
        `SUMMARY:${esc('Registration opens: ' + c.name)}`, `DESCRIPTION:${esc('Register on LiveHeats. Memberships must be active first.\n' + links)}`,
        `URL:${c.liveheats_url ?? c.hub_url}`);
      if (opts.alarms) L.push(...alarm('-P1D', `Registration opens tomorrow: ${c.name}`), ...alarm('-PT15M', `Registration opens in 15 min: ${c.name}`));
      L.push('END:VEVENT');
    }
    if (c.registration_closes) {
      L.push('BEGIN:VEVENT', `UID:regclose-${id}@ifsaeventhub.com`, `DTSTAMP:${now}`,
        `DTSTART:${stamp(c.registration_closes)}`, `DTEND:${stamp(new Date(Date.parse(c.registration_closes) + 15 * 60000).toISOString())}`,
        `SUMMARY:${esc('Registration closes: ' + c.name)}`, `DESCRIPTION:${esc('Registration closes. Make sure your entry is in on LiveHeats.\n' + links)}`,
        `URL:${c.liveheats_url ?? c.hub_url}`);
      if (opts.alarms) L.push(...alarm('-P1D', `Registration closes in 24h: ${c.name}`), ...alarm('-PT2H', `Registration closes in 2h: ${c.name}`));
      L.push('END:VEVENT');
    }
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}
