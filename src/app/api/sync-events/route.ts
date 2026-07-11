import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { fetchIfsaU19_2star_3star } from "@/lib/ifsaEvents";

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

    const payload = await Promise.all(
      events.map(async (e: any) => {
        const prev = existingMap.get(e.ifsa_url);
        let lat = prev?.lat ?? null;
        let lon = prev?.lon ?? null;

        if ((!lat || !lon) && e.location_text) {
          const coords = await geocode(e.location_text);
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

    return NextResponse.json({ ok: true, count: payload.length });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
