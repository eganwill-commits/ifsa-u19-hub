'use client';
import { useState } from 'react';

export default function AthletesPage() {
  const [query, setQuery] = useState('');
  const [searchUrl, setSearchUrl] = useState('');

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearchUrl('https://liveheats.com/athletes?search=' + encodeURIComponent(query));
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 60px', fontFamily: 'system-ui', color: '#e8e8e8' }}>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, marginBottom: 4 }}>Athlete Search</h1>
      <p style={{ color: '#aaa', fontSize: 14, marginBottom: 20 }}>Search for IFSA U19 athletes by name.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Search athlete name..."
          style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '2px solid #ffcc00', background: '#0e0e0e', color: '#fff', fontSize: 'clamp(13px, 3vw, 15px)', fontFamily: 'system-ui', outline: 'none', minWidth: 0 }}
          autoFocus
        />
        <button
          onClick={handleSearch}
          style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#ffcc00', color: '#000', fontWeight: 700, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Search
        </button>
      </div>

      {searchUrl ? (
        <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, overflow: 'hidden' }}>
          <iframe
            key={searchUrl}
            src={searchUrl}
            style={{ width: '100%', height: 'clamp(500px, 80vh, 800px)', border: 'none', background: '#fff', display: 'block' }}
            title="Athlete Search Results"
          />
        </div>
      ) : (
        <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, padding: '32px 20px', background: 'rgba(10,10,10,0.8)', textAlign: 'center' }}>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>
            Enter an athlete name above to search their LiveHeats profile, competition history and results.
          </p>
        </div>
      )}
    </main>
  );
}