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
      <p style={{ color: '#aaa', fontSize: 14, marginBottom: 20 }}>Search {4341} IFSA U19 athletes by name.</p>

      <input
        type="text"
        value={query}
        onChange={e => setQuer