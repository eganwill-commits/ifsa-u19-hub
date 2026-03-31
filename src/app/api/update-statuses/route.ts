import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST() {
  try {
    const sb = supabaseServer();
    const today = new Date().toISOString().split("T")[0];

    // Mark completed if end_date is past
    const { count: count1 } = await sb
      .from("ifsa_events")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .lt("end_date", today)
      .neq("status", "completed");

    // Mark completed if start_date was 4+ days ago and still upcoming (no end_date or end_date missing)
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    const fourDaysAgoStr = fourDaysAgo.toISOString().split("T")[0];

    const { count: count2 } = await sb
      .from("ifsa_events")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .lt("start_date", fourDaysAgoStr)
      .neq("status", "completed")
      .or("end_date.is.null,end_date.gte." + today);

    return NextResponse.json({ ok: true, updated_by_end_date: count1, updated_by_start_date: count2 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}