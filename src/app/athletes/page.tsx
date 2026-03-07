'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Athlete = {
  id: string;
  name: string;
  liveheats_url: string | null;
};

export default function AthletesPage() {
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('athletes').select('*', { count: 'exact', head: true })
      .then(({ count }) => setTotalCount(count));
  }, [supabase]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearched(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('athletes')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name')
        .limit(50);
      setResults(data || []);
      setSearched(true);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, supabase]);

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px 60px', fontFamily: 'system-ui', color: '#e8e8e8' }}>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, marginBottom: 4 }}>Athlete Search</h1>
      <p style={{ color: '#aaa', fontSize: 14, marginBottom: 20 }}>
        Search {totalCount ? totalCount.toLocaleString() : '...'} IFSA U19 athletes by name.
      </p>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search athlete name..."
        style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '2px solid #ffcc00', background: '#0e0e0e', color: '#fff', fontSize: 15, fontFamily: 'system-ui', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
        autoFocus
      />
      {loading && <div style={{ color: '#aaa', fontSize: 14 }}>Searching...</div>}
      {!loading && searched && results.length === 0 && (
        <div style={{ color: '#aaa', fontSize: 14, fontStyle: 'italic' }}>No athletes found for "{query}"</div>
      )}
      {!loading && results.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {results.map(a => (
            <div key={a.id}
              style={{ border: '1px solid #1e1e1e', borderRadius: 12, padding: '12px 16px', background: 'rgba(10,10,10,0.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: '#e8e8e8' }}>{a.name}</span>
            </div>
          ))}
        </div>
      )}
      {!searched && !loading && (
        <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, padding: '32px 20px', background: 'rgba(10,10,10,0.8)', textAlign: 'center' }}>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>Start typing to search athletes.</p>
        </div>
      )}
    </main>
  );
}