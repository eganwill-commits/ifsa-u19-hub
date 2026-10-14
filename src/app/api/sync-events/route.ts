import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { fetchIfsaU19_2star_3star } from "@/lib/ifsaEvents";

// Vercel Hobby ceiling. Without this the route uses the short default timeout and
// silently 5xx'd all of Sept/Oct 2026, freezing ifsa_events.
export const maxDuration = 60;

async function geocode(locationText: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationText)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results?.[0]) {
      return { lat: data.results[0].latitude, lon: data.results[0].longitude };
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST() {
  try {
    const sb = supabaseServer();
    const events = await fetchIfsaU19_2star_3star();

    const { data: existing } = await sb
      .from("ifsa_events")
      .select("ifsa_url, lat, lon");

    const existingMap = new Map(
      (existing ?? []).map((e: any) => [e.ifsa_url, { lat: e.lat, lon: e.lon }])
    );

    // Geocoding is the slow part: one external call per event with no coords.
    // At the start of a season every event is new, which is what blew the timeout.
    // Two guards: cache by location (events repeat venues across divisions), and
    // cap calls per run. Unresolved coords are simply picked up on the next run --
    // getting the EVENTS in matters far more than getting the pins in immediately.
    const GEOCODE_BUDGET = 25;
    let geocodeCalls = 0;
    const geoCache = new Map<string, { lat: number; lon: number } | null>();

    const payload = await Promise.all(
      events.map(async (e: any) => {
        const prev = existingMap.get(e.ifsa_url);
        let lat = prev?.lat ?? null;
        let lon = prev?.lon ?? null;

        if ((!lat || !lon) && e.location_text) {
          const key = e.location_text.trim().toLowerCase();
          let coords = geoCache.get(key);
          if (coords === undefined && geocodeCalls < GEOCODE_BUDGET) {
            geocodeCalls++;
            coords = await geocode(e.location_text);
            geoCache.set(key, coords);
          }
          if (coords) {
            lat = coords.lat;
            lon = coords.lon;
          }
        }

        return {
          name: e.name,
          stars: e.stars,
          discipline: e.discipline,
          gender: e.gender,
          division: e.division,
          ifsa_url: e.ifsa_url,
          status: e.status ?? "upcoming",
          updated_at: new Date().toISOString(),
          start_date: e.start_date ?? null,
          end_date: e.end_date ?? null,
          venue_name: e.venue_name ?? null,
          location_text: e.location_text ?? null,
          lat,
          lon,
        };
      })
    );

    const { error } = await sb.from("ifsa_events").upsert(payload, {
      onConflict: "ifsa_url,division",
    });

    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      count: payload.length,
      geocoded: geocodeCalls,
      geocodePending: payload.filter((p: any) => !p.lat).length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
