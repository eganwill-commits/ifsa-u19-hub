// Source of truth: https://ifsafreeride.org/rulebook-guidelines/ (checked Nov 2026).
// When IFSA posts a new rulebook, update RULEBOOK and the points-table page.
const RULEBOOK = {
  title: '2026–2027 IFSA Athlete Series Rulebook',
  updated: 'Updated June 1, 2026',
  url: 'https://ifsafreeride.org/wp-content/uploads/2026/06/2027-Spring-IFSA-Athlete-Series-Handbook.pdf',
  pointsTablePage: 60, // "Appendix 1 – Region 2 IFSA Junior Points Table"
};

const GUIDES = [
  { label: '2027 Membership Guide', sub: 'Buy IFSA + regional memberships first — LiveHeats won’t let you enter without them', url: 'https://ifsafreeride.org/wp-content/uploads/2026/11/2027-Membership-Guide.pdf' },
  { label: 'Registration Guide: 2*, U12 & Qualifiers', sub: 'How entry works for Junior 2*, U12 and Qualifier comps', url: 'https://ifsafreeride.org/wp-content/uploads/2026/11/2027-Event-Registration-Guide.pdf' },
  { label: 'Registration Guide: Junior 3*', sub: 'How entry works for Junior 3* comps', url: 'https://ifsafreeride.org/wp-content/uploads/2026/10/2027-JUNIOR-SERIES-3_-EVENT-REGISTRATION-GUIDE.pdf' },
  { label: 'Cancellation Policy', sub: 'Refund timelines', url: 'https://ifsafreeride.org/wp-content/uploads/2025/10/IFSA-Cancellation-Policy-.pdf' },
  { label: 'How to cancel an entry', sub: 'Step-by-step on LiveHeats', url: 'https://ifsafreeride.org/wp-content/uploads/2025/12/How-to-Cancel-Your-Entry-in-a-Division.pdf' },
  { label: 'All IFSA rulebooks & guides', sub: 'Spanish / French versions, qualifier rules', url: 'https://ifsafreeride.org/rulebook-guidelines/' },
];

export default function RulesPage() {
  const pdfUrl = RULEBOOK.url;
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 60px', fontFamily: 'system-ui', color: '#e8e8e8' }}>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, marginBottom: 4 }}>Rules &amp; Guides</h1>
      <p style={{ color: '#aaa', fontSize: 14, marginBottom: 16 }}>{RULEBOOK.title} · {RULEBOOK.updated}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <a href={pdfUrl} target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 8, border: '1px solid #ffcc00', color: '#ffcc00', fontSize: 13, textDecoration: 'none' }}>
          Open rulebook PDF ↗
        </a>
        <a href={`${pdfUrl}#page=${RULEBOOK.pointsTablePage}`} target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 8, border: '1px solid #ffcc00', background: '#ffcc00', color: '#000', fontSize: 13, textDecoration: 'none', fontWeight: 700 }}>
          Junior Points Table (p.{RULEBOOK.pointsTablePage}) ↗
        </a>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>Before you register</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, marginBottom: 20 }}>
        {GUIDES.map((g) => (
          <a key={g.url} href={g.url} target="_blank" rel="noreferrer"
            style={{ display: 'block', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 12px', textDecoration: 'none', color: '#e8e8e8', background: 'rgba(10,10,10,0.8)' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{g.label} ↗</div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{g.sub}</div>
          </a>
        ))}
      </div>

      <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, overflow: 'hidden', background: 'rgba(10,10,10,0.8)' }}>
        <iframe
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
          style={{ width: '100%', height: 'clamp(500px, 80vh, 900px)', border: 'none', display: 'block' }}
          title={RULEBOOK.title}
        />
      </div>
    </main>
  );
}
