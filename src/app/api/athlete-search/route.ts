import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) return NextResponse.json({ athletes: [] });

  const res = await fetch('https://liveheats.com/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query { entrantsByName(search: ${JSON.stringify(q)}, limit: 20) { id name gender teamName } }`
    }),
  });

  const data = await res.json();
  console.log('LiveHeats response:', JSON.stringify(data));
  const athletes = data?.data?.entrantsByName || [];
  return NextResponse.json({ athletes, raw: data });
}