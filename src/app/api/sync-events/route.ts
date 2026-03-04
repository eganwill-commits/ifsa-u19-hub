import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { fetchIfsaU19_2star_3star } from "@/lib/ifsaEvents";

export async function POST() {
  try {
    const sb = supabaseServer();
    const events = await fetchIfsaU19_2star_3star();

    const payload = events.map((e: any) => ({
      name: e.name,
      stars: e.stars,
      discipline: e.discipline,
      gender: e.gender,
      ifsa_url: e.ifsa_url,
      status: e.status ?? "upcoming",
      updated_at: new Date().toISOString(),
      start_date: e.start_date ?? null,
      end_date: e.end_date ?? null,
      venue_name: e.venue_name ?? null,
      location_text: e.location_text ?? null,
    }));

    const { error } = await sb.from("ifsa_events").upsert(payload, {
      onConflict: "ifsa_url",
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