import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST() {
  try {
    const sb = supabaseServer();
    const { error, count } = await sb
      .from("ifsa_events")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .lt("end_date", new Date().toISOString().split("T")[0])
      .neq("status", "completed");

    if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
    return NextResponse.json({ ok: true, updated: count });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}
