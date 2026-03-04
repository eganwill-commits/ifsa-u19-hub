'use client';
import { useState } from 'react';
import Link from 'next/link';

const links = [
  { href: '/events', label: 'Events' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/athletes', label: 'Athletes' },
  { href: '/admin', label: 'Admin' },
];

export default function Nav() {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <nav style={{ borderBottom: '1px solid #1e1e1e', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 100 }}>
      <Link href="/" style={{ fontFamily: 'system-ui', fontWeight: 900, fontSize: 18, color: '#e8e8e8', textDecoration: 'none', letterSpacing: '-0.5px' }}>
        IFSA U19 <span style={{ color: '#ffcc00' }}>Hub</span>
      </Link>
      <div style={{ display: 'flex', gap: 4 }}>
        {links.map(l => (
          <Link key={l.href} href={l.href}
            onMouseEnter={() => setHovered(l.href)}
            onMouseLeave={() => setHovered(null)}
            style={{ color: hovered === l.href ? '#000' : '#ffcc00', textDecoration: 'none', fontSize: 14, padding: '6px 12px', borderRadius: 8, fontFamily: 'system-ui', fontWeight: 600, background: hovered === l.href ? '#ffcc00' : 'transparent', transition: 'all 0.15s ease', boxShadow: hovered === l.href ? '0 0 16px rgba(255,204,0,0.4)' : 'none' }}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}