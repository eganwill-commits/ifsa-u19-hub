import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { matchLiveHeatsEventId } from "@/lib/liveheats";

// Matching many events makes external calls; give it room on Vercel.
export const maxDuration = 60;

/**
 * Backfills ifsa_events.liveheats_url for any events that don't have one yet,
 * by matching their name against LiveHeats. Deduped by name and written
 * incrementally, so re-running continues where a previous run left off (and a
 * timeout never loses progress).
 */
export async function POST() {
  try {
    const sb = supabaseServer();

    const { data: unmatched, error: selErr } = await sb
      .from("ifsa_events")
      .select("id,name")
      .is("liveheats_url", null);

    if (selErr) {
      return NextResponse.json({ ok: false, error: selErr }, { status: 500 });
    }

    const distinctNames = [...new Set((unmatched ?? []).map((e: { name: string }) => e.name))];

    let linked = 0;
    let matchedNames = 0;
    for (const name of distinctNames) {
      const lhId = await matchLiveHeatsEventId(name);
      if (lhId) {
        matchedNames++;
        const { data: rows } = await sb
          .from("ifsa_events")
          .update({ liveheats_url: `https://liveheats.com/events/${lhId}` })
          .is("liveheats_url", null)
          .eq("name", name)
          .select("id");
        linked += rows?.length ?? 0;
      }
      // Be gentle with the LiveHeats API.
      await new Promise((r) => setTimeout(r, 150));
    }

    return NextResponse.json({
      ok: true,
      names_checked: distinctNames.length,
      names_matched: matchedNames,
      rows_linked: linked,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
