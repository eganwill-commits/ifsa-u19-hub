// "From the Event Guide": the facts parents dig through the Google Doc for,
// parsed by scripts/lib/parse-guide.js during the daily sync.
type Section = { text: string; links: { label: string; url: string }[] };
export type GuideInfo = {
  event_dates?: string;
  inspection?: string;
  weather_day?: string;
  sections: Record<string, Section>;
  schedule: { date: string; time: string; activity: string; location: string }[];
};

const DETAIL_ORDER: [string, string][] = [
  ['communication', 'Day-of communication'],
  ['lift_tickets', 'Lift tickets'],
  ['lodging', 'Lodging'],
  ['parking', 'Parking & shuttle'],
  ['spectators', 'Spectators'],
  ['venue_directions', 'On-mountain venue directions'],
  ['passes', 'Season passes accepted'],
  ['weather_sources', 'Weather sources'],
  ['event_links', 'Trail maps & links'],
  ['special_events', 'Special events'],
];

const box = { border: '1px solid #2a2a2a', borderRadius: 12, padding: '10px 12px', background: 'rgba(0,0,0,0.3)' } as const;
const label = { fontSize: 10, color: '#777', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 4 };

function Lines({ text }: { text: string }) {
  return <>{text.split('\n').map((l, i) => <div key={i}>{l}</div>)}</>;
}

export default function GuideHighlights({ guide, guideUrl, fetchedAt }: { guide: GuideInfo; guideUrl: string | null; fetchedAt: string | null }) {
  const s = guide.sections || {};
  const facts = [
    { k: 'Fees', v: s.fees?.text },
    { k: 'Caps', v: s.caps?.text },
    { k: 'Inspection', v: guide.inspection },
    { k: 'Weather day', v: guide.weather_day },
  ].filter((f) => f.v);
  const details = DETAIL_ORDER.filter(([k]) => s[k]?.text);
  if (!facts.length && !details.length && !guide.schedule?.length) return null;

  return (
    <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, padding: 20, marginBottom: 16, background: 'rgba(10,10,10,0.8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>From the Event Guide</h2>
        {guideUrl && <a href={guideUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#ffcc00' }}>Open full guide ↗</a>}
      </div>

      {facts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 12 }}>
          {facts.map((f) => (
            <div key={f.k} style={box}>
              <div style={label}>{f.k}</div>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}><Lines text={f.v!} /></div>
            </div>
          ))}
        </div>
      )}

      {s.divisions?.text && (
        <div style={{ ...box, marginBottom: 12, fontSize: 13, color: '#ccc' }}>
          <div style={label}>Divisions</div><Lines text={s.divisions.text} />
        </div>
      )}

      {guide.schedule?.length > 0 && (
        <details style={{ marginBottom: 8 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14, padding: '6px 0' }}>Schedule ({guide.schedule.length} items)</summary>
          <div style={{ overflowX: 'auto', marginTop: 6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {guide.schedule.map((r, i) => {
                  const newDay = i === 0 || guide.schedule[i - 1].date !== r.date;
                  return (
                    <tr key={i} style={{ borderTop: newDay ? '1px solid #333' : '1px solid #1a1a1a', verticalAlign: 'top' }}>
                      <td style={{ padding: '6px 8px', color: '#ffcc00', whiteSpace: 'nowrap', fontSize: 12 }}>{newDay ? r.date : ''}</td>
                      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{r.time}</td>
                      <td style={{ padding: '6px 8px' }}><Lines text={r.activity} /></td>
                      <td style={{ padding: '6px 8px', color: '#999' }}>{r.location}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {details.map(([k, title]) => (
        <details key={k} style={{ borderTop: '1px solid #1e1e1e' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14, padding: '8px 0' }}>{title}</summary>
          <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, paddingBottom: 10 }}>
            <Lines text={s[k].text} />
            {s[k].links.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {s[k].links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={{ color: '#ffcc00', fontSize: 12 }}>{l.label} ↗</a>
                ))}
              </div>
            )}
          </div>
        </details>
      ))}

      <div style={{ fontSize: 11, color: '#666', marginTop: 10 }}>
        Pulled from the organizer’s guide{fetchedAt ? ` on ${new Date(fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}.
        Organizers often carry over last season’s prices and schedule until they update — check the guide before you travel.
      </div>
    </div>
  );
}
