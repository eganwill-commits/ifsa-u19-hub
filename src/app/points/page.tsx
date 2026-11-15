import type { Metadata } from 'next';
import PointsCalculator from '@/components/PointsCalculator';
import { pointsTableRows, RULEBOOK_POINTS_PAGE } from '@/lib/points';

export const metadata: Metadata = {
  title: 'Points & qualification · IFSA Event Hub',
  description: 'How IFSA junior points, rankings, seeding, registration and JFC qualification work — in plain English.',
};

// Everything on this page is from the 2026-2027 IFSA Athlete Series Rulebook
// (updated June 1, 2026). Page refs in brackets so it can be re-checked each season.
const RULEBOOK = 'https://ifsafreeride.org/wp-content/uploads/2026/06/2027-Spring-IFSA-Athlete-Series-Handbook.pdf';
const ref = (page: number) => `${RULEBOOK}#page=${page}`;

const card = { border: '1px solid #2a2a2a', borderRadius: 16, padding: '16px 18px', background: 'rgba(10,10,10,0.8)', marginBottom: 12 } as const;
const h2 = { fontSize: 17, fontWeight: 800, margin: '0 0 8px' } as const;
const li = { marginBottom: 6, lineHeight: 1.5 } as const;
const src = (page: number) => (
  <a href={ref(page)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#777', marginLeft: 6 }}>rulebook p.{page} ↗</a>
);

export default function PointsPage() {
  const rows = pointsTableRows();
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 60px', fontFamily: 'system-ui', color: '#e8e8e8' }}>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, margin: '0 0 4px' }}>Points &amp; qualification</h1>
      <p style={{ color: '#aaa', fontSize: 14, margin: '0 0 16px' }}>
        How the IFSA junior season works, in plain English. Source: 2026–27 IFSA Athlete Series Rulebook.
      </p>

      <div style={{ marginBottom: 16 }}><PointsCalculator /></div>

      <section style={card}>
        <h2 style={h2}>Which division? {src(19)}</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li style={li}>Set by age on <b>December 31</b>: <b>U12</b> = 11 and under · <b>U15</b> = 12–14 · <b>U19</b> = 15–18.</li>
          <li style={li}>No exceptions — racing the wrong division is a DQ.</li>
          <li style={li}><b>U12 is unranked</b>: no points, no seeding, first-come registration, and no U12 at 3★ comps. {src(16)}</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2}>How the ranking works {src(31)}</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li style={li}>The season runs <b>June 1 – May 31</b>.</li>
          <li style={li}>You can earn points at <b>4 regular-season comps</b>. Your ranking is your <b>best 3 of those first 4</b>.</li>
          <li style={li}>A comp after your 4th only counts if it’s a <b>Friendly</b> entry — prizes and podiums, no points.</li>
          <li style={li}><b>Max three 3★ comps</b> per season. No limit on 2★ within your 4.</li>
          <li style={li}><b>JFC points are added on top</b> of your best 3 to decide the overall Junior Champions.</li>
          <li style={li}>Every finish earns its base points <b>+1 point for each athlete you beat</b> in your division. {src(60)}</li>
          <li style={li}>Cancelled comps award no points and don’t use up one of your 4.</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2}>Seeding ≠ ranking {src(30)}</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li style={li}><b>Seeding</b> = your top 3 results from the <b>last 52 weeks</b> (rolling). It decides who gets into comps.</li>
          <li style={li}><b>Ranking</b> = this season only. It decides JFC and FJWC invites.</li>
          <li style={li}>So a strong late-season result helps next season’s registration even after the ranking resets.</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2}>How registration works {src(34)}</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li style={li}>Have your <b>IFSA + home-region memberships</b> active first — LiveHeats won’t let you enter without them. {src(13)}</li>
          <li style={li}><b>2★:</b> registration opens 4–8 weeks out and stays open <b>72 hours</b>. Everyone goes on a waitlist. Then <b>50% of spots go by seed</b> and <b>50% by timestamp</b> (who registered first). {src(34)}</li>
          <li style={li}><b>Northern, Rockies and Western Canada</b> 2★s fill with in-region athletes first, then may reopen to others. {src(34)}</li>
          <li style={li}><b>3★ (Northern Hemisphere):</b> one registration window in Nov/Dec for all 3★s. <b>90% of spots by seed</b>, confirmed by mid-December; the <b>last 10%</b> go out three weeks before each comp using the then-current seeding. No open/timestamp entry. {src(35)}</li>
          <li style={li}>After 3★ field sizes are shared you get <b>72 hours to cancel free</b>. Cancel unwanted entries yourself to avoid fees. {src(36)}</li>
          <li style={li}><b>Chile/Argentina 3★:</b> opens ~6 weeks out, closes 10 days before. {src(36)}</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2}>Championships {src(26)}</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li style={li}><b>Junior Freeride Championships (JFC)</b>, April — invite-only from the ranking (best 3 of 4). Cut-off is usually <b>mid-March</b>; comps after it don’t count toward the invite. No team quotas or wildcards. Fewer than 10% of athletes get in. {src(12)}</li>
          <li style={li}><b>Regional 2★ Championships</b> — end of season, for athletes <b>not</b> going to JFC. Confirmed by current ranking; one per season. If you’ve used your 4, it can be a 5th event that improves <i>seeding</i> (not ranking). {src(17)}</li>
          <li style={li}><b>U12 Regional Championships</b> — first come, first served; must have done at least one regular U12 comp. {src(25)}</li>
          <li style={li}><b>Freeride Junior World Championship (FJWC)</b>, Europe — <b>U19 only</b>, invited from the final IFSA ranking including JFC. {src(26)}</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2}>Points table {src(RULEBOOK_POINTS_PAGE)}</h2>
        <p style={{ fontSize: 13, color: '#aaa', margin: '0 0 10px' }}>Base points by finish. 45th and below get the 44th-place value. Add +1 per athlete beaten.</p>
        <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto', border: '1px solid #1e1e1e', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'monospace' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#111' }}>
              <tr style={{ color: '#888', textAlign: 'right' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left' }}>Place</th>
                <th style={{ padding: '6px 10px' }}>2★</th>
                <th style={{ padding: '6px 10px' }}>3★</th>
                <th style={{ padding: '6px 10px' }}>JFC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([place, jfc, three, two]) => (
                <tr key={place} style={{ borderTop: '1px solid #1a1a1a', textAlign: 'right' }}>
                  <td style={{ padding: '5px 10px', textAlign: 'left', color: place <= 3 ? '#ffcc00' : '#ccc' }}>{place}{place === 44 ? '+' : ''}</td>
                  <td style={{ padding: '5px 10px' }}>{two}</td>
                  <td style={{ padding: '5px 10px' }}>{three}</td>
                  <td style={{ padding: '5px 10px' }}>{jfc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: '#777', margin: '10px 0 0' }}>
          Small 3★ fields: with 2 athletes, 1st earns 836 and 2nd 738; a lone athlete earns 738. {src(36)}
        </p>
      </section>

      <p style={{ fontSize: 12, color: '#666' }}>
        Summary for convenience — the <a href={RULEBOOK} target="_blank" rel="noreferrer" style={{ color: '#999' }}>official rulebook</a> wins if anything here differs.
      </p>
    </main>
  );
}
