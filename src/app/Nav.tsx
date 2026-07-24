'use client';
import { useState } from 'react';
import Link from 'next/link';

const links = [
  { href: '/events', label: 'Events' },
  { href: '/athletes', label: 'Athletes' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/rules', label: 'Rules' },
  { href: '/admin', label: 'Admin' },
];

export default function Nav() {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <nav style={{ borderBottom: '1px solid #1e1e1e', padding: '0 12px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 100 }}>
      <Link href="/" style={{ fontFamily: 'system-ui', fontWeight: 900, fontSize: 16, color: '#e8e8e8', textDecoration: 'none', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
        IFSA Event <span style={{ color: '#ffcc00' }}>Hub:</span>
      </Link>
      <div style={{ display: 'flex', gap: 2 }}>
        {links.map(l => (
          <Link key={l.href} href={l.href}
            onMouseEnter={() => setHovered(l.href)}
            onMouseLeave={() => setHovered(null)}
            style={{ color: hovered === l.href ? '#000' : '#ffcc00', textDecoration: 'none', fontSize: 13, padding: '5px 8px', borderRadius: 8, fontFamily: 'system-ui', fontWeight: 600, background: hovered === l.href ? '#ffcc00' : 'transparent', transition: 'all 0.15s ease', whiteSpace: 'nowrap' }}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}