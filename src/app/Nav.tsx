'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/athletes', label: 'Athletes' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/points', label: 'Points' },
  { href: '/rules', label: 'Rules' },
];

/** Home only matches "/" exactly; other links also match their sub-pages (/events/123). */
function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
}

export default function Nav() {
  const [hovered, setHovered] = useState<string | null>(null);
  const pathname = usePathname() ?? '/';
  return (
    <nav className="hub-nav" style={{ borderBottom: '1px solid #1e1e1e', padding: '0 12px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 100 }}>
      <Link href="/" style={{ fontFamily: 'system-ui', fontWeight: 900, fontSize: 16, color: '#e8e8e8', textDecoration: 'none', letterSpacing: '-0.5px', whiteSpace: 'nowrap', flexShrink: 0, marginRight: 8 }}>
        IFSA Event <span style={{ color: '#ffcc00' }}>Hub:</span>
      </Link>
      <div className="hub-nav-links" style={{ display: 'flex', gap: 2, overflowX: 'auto', minWidth: 0, scrollbarWidth: 'none' }}>
        {links.map(l => {
          const active = isActive(pathname, l.href);
          const lit = active || hovered === l.href;
          return (
            <Link key={l.href} href={l.href}
              aria-current={active ? 'page' : undefined}
              onMouseEnter={() => setHovered(l.href)}
              onMouseLeave={() => setHovered(null)}
              style={{ color: lit ? '#000' : '#ffcc00', textDecoration: 'none', fontSize: 13, padding: '5px 8px', borderRadius: 8, fontFamily: 'system-ui', fontWeight: active ? 800 : 600, background: lit ? '#ffcc00' : 'transparent', transition: 'all 0.15s ease', whiteSpace: 'nowrap' }}>
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
