import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Searches the athletes table by name. (Previously called LiveHeats'
// `entrantsByName`, which no longer exists on their schema; there is no public
// global athlete search, so this reads the same Supabase table the UI uses.)
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ athletes: [] });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("athletes")
    .select("id,name,liveheats_url")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(20);

  if (error) {
    return NextResponse.json({ athletes: [], error: error.message }, { status: 500 });
  }
  return NextResponse.json({ athletes: data ?? [] });
}
