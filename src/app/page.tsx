import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '60px 16px', fontFamily: 'system-ui', color: '#e8e8e8', textAlign: 'center' }}>
      <h1 style={{ fontSize: 'clamp(32px, 8vw, 56px)', fontWeight: 900, marginBottom: 16, letterSpacing: '-1px' }}>
        IFSA U19 <span style={{ color: '#ffcc00' }}>Hub</span>
      </h1>
      <p style={{ fontSize: 'clamp(15px, 3vw, 18px)', color: '#aaa', maxWidth: 560, margin: '0 auto 48px', lineHeight: 1.6 }}>
        The unofficial home for IFSA U19 freeride ski and snowboard competitions. Events, results, rankings and athlete search — all in one place.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, maxWidth: 700, margin: '0 auto' }}>
        {[
          { href: '/events', label: 'Events', desc: 'Browse 2★ and 3★ competitions', color: '#4a9edd' },
          { href: '/rankings', label: 'Rankings', desc: 'Live U19 rankings from IFSA', color: '#ffcc00' },
          { href: '/athletes', label: 'Athletes', desc: 'Search athlete profiles', color: '#4caf50' },
        ].map(item => (
          <Link key={item.href} href={item.hr