// Subscribe-able calendar feed: comps + registration open/close times.
//   /api/calendar                       all upcoming comps
//   /api/calendar?region=Northern        one IFSA region (ifsa_region)
//   /api/calendar?division=U15           one age division
//   /api/calendar?comps=<id>,<id>        specific comps (any ifsa_events row id)
//   &download=1                          serve as an attachment (one-off import)
// No account: the URL itself is the subscription.
import { createClient } from '@supabase/supabase-js';
import { buildCalendar, type CompForCal } from '@/lib/ics';

export const revalidate = 1800;

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const region = url.searchParams.get('region');
  const division = url.searchParams.get('division');
  const download = url.searchParams.get('download') === '1';
  const compIds = (url.searchParams.get('comps') || '').split(',').map((s) => s.trim()).filter((s) => UUID.test(s)).slice(0, 100);

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  let q = sb.from('ifsa_events')
    .select('id,name,start_date,end_date,venue_name,location_text,street_address,registration_opens,registration_closes,liveheats_url,ifsa_url,event_guide_url,division,ifsa_region')
    .eq('hidden', false)
    .order('start_date', { ascending: true })
    .limit(2000);

  if (compIds.length) {
    const { data: picked } = await sb.from('ifsa_events').select('ifsa_url').in('id', compIds);
    const urls = [...new Set((picked ?? []).map((r) => r.ifsa_url).filter(Boolean))];
    if (!urls.length) return ics(buildCalendar([], 'IFSA – my comps', { alarms: true }), download);
    q = q.in('ifsa_url', urls);
  } else {
    q = q.gte('start_date', since);
    if (region) q = q.ilike('ifsa_region', region);
  }

  const { data, error } = await q;
  if (error) return new Response('Calendar unavailable', { status: 500 });

  const comps = new Map<string, CompForCal & { _ids: string[] }>();
  for (const r of data ?? []) {
    const key = r.ifsa_url || r.name;
    const c = comps.get(key);
    if (c) { if (r.division && !c.divisions.includes(r.division)) c.divisions.push(r.division); continue; }
    comps.set(key, {
      key, name: r.name, start_date: r.start_date, end_date: r.end_date, venue_name: r.venue_name,
      location_text: r.location_text, street_address: r.street_address,
      registration_opens: r.registration_opens, registration_closes: r.registration_closes,
      liveheats_url: r.liveheats_url, ifsa_url: r.ifsa_url, event_guide_url: r.event_guide_url,
      hub_url: `${origin}/events/${r.id}`, divisions: r.division ? [r.division] : [], _ids: [r.id],
    });
  }
  let list = [...comps.values()];
  if (division && !compIds.length) list = list.filter((c) => c.divisions.includes(division.toUpperCase()));
  for (const c of list) c.divisions.sort();

  const name = compIds.length ? 'IFSA – my comps'
    : `IFSA Junior${region ? ' – ' + region : ''}${division ? ' ' + division.toUpperCase() : ''}`;
  return ics(buildCalendar(list, name, { alarms: true }), download);
}

function ics(body: string, download: boolean) {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      ...(download ? { 'Content-Disposition': 'attachment; filename="ifsa-comps.ics"' } : {}),
    },
  });
}
