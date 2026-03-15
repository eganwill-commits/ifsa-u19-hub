import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractName(question: string): Promise<string | null> {
  const words = question.split(/\s+/);
  // Look for capitalized word pairs as likely names
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i].replace(/[^a-zA-Z]/g, '');
    const w2 = words[i + 1].replace(/[^a-zA-Z]/g, '');
    if (w1.length > 1 && w2.length > 1 && w1[0] === w1[0].toUpperCase() && w2[0] === w2[0].toUpperCase()) {
      return w1 + ' ' + w2;
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    const sb = supabaseServer();

    // Try to extract an athlete name from the question for targeted search
    const athleteName = await extractName(question);

    let rankingsQuery = sb.from("rankings_snapshots")
      .select("athlete_name, athlete_id, division, discipline, gender, place, points")
      .order("place", { ascending: true });

    // If we detected a name, search for it specifically
    if (athleteName) {
      const parts = athleteName.split(' ');
      rankingsQuery = rankingsQuery.or(
        `athlete_name.ilike.%${athleteName}%,athlete_name.ilike.%${parts[0]}%`
      );
    }

    rankingsQuery = rankingsQuery.limit(athleteName ? 50 : 500);

    const [{ data: events }, { data: rankings }] = await Promise.all([
      sb.from("ifsa_events")
        .select("name, status, start_date, end_date, venue_name, location_text, stars, discipline, gender")
        .order("start_date", { ascending: false })
        .limit(100),
      rankingsQuery,
    ]);

    const context = `
You are an AI assistant for the IFSA Junior Freeride Hub — a platform tracking U19 and U15 freeride ski and snowboard competitions.
Answer questions about athletes, events, and rankings using the data below.
Report findings directly and confidently. If an athlete appears in the data, always report their place, points, and division.
Be concise and direct.

EVENTS (${events?.length ?? 0} total):
${JSON.stringify(events ?? [], null, 2)}

RANKINGS (${rankings?.length ?? 0} results):
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