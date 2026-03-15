import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    const sb = supabaseServer();

    const [{ data: events }, { data: rankings }] = await Promise.all([
      sb.from("ifsa_events")
        .select("name, status, start_date, end_date, venue_name, location_text, stars, discipline, gender")
        .order("start_date", { ascending: false })
        .limit(200),
      sb.from("rankings_snapshots")
        .select("athlete_name, athlete_id, division, discipline, gender, place, points, event_name, event_date, score")
        .order("place", { ascending: true })
        .limit(3000),
    ]);

    const context = `
You are an AI assistant for the IFSA Junior Freeride Hub — a platform tracking U19 and U15 freeride ski and snowboard competitions.
Answer questions about athletes, events, and rankings using the data below.
When asked about an athlete, always search thoroughly through the rankings data by athlete_name before saying they are not found.
Report findings directly and confidently. Do not say you cannot find someone if they appear in the data.
If an athlete appears in multiple divisions, report all of them.
Be concise and direct.

EVENTS (${events?.length ?? 0} total):
${JSON.stringify(events ?? [], null, 2)}

RANKINGS (${rankings?.length ?? 0} total — includes place, points, division for each athlete):
${JSON.stringify(rankings ?? [], null, 2)}
    `.trim();

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: context,
      messages: [{ role: "user", content: question }],
    });

    const text = message.content.find((b) => b.type === "text")?.text ?? "Sorry, I could not generate a response.";
    return NextResponse.json({ ok: true, answer: text });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}