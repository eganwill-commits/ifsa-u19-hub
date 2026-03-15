import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractName(question: string): string | null {
  const words = question.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i].replace(/[^a-zA-Z]/g, '');
    const w2 = words[i + 1].replace(/[^a-zA-Z]/g, '');
    if (w1.length > 1 && w2.length > 1 && w1[0] === w1[0].toUpperCase() && w2[0] === w2[0].toUpperCase()) {
      return w1 + ' ' + w2;
    }
  }
  return null;
}

function extractEventName(question: string): string | null {
  const keywords = ['at', 'in', 'for', 'from', 'results', 'winners', 'who won'];
  const q = question.toLowerCase();
  for (const kw of keywords) {
    const idx = q.indexOf(kw);
    if (idx !== -1) {
      const after = question.slice(idx + kw.length).trim();
      const words = after.split(/\s+/).slice(0, 4).join(' ');
      if (words.length > 3) return words;
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    const sb = supabaseServer();

    const athleteName = extractName(question);
    const eventKeyword = extractEventName(question);

    const isEventQuestion = /who won|results|winner|podium|place|finish|division/.test(question.toLowerCase());
    const isAthleteQuestion = /ranking|rank|points|standing|athlete/.test(question.toLowerCase()) || !!athleteName;

    let rankingsData: any[] = [];
    let eventResultsData: any[] = [];

    if (isAthleteQuestion && athleteName) {
      const parts = athleteName.split(' ');
      const { data } = await sb.from("rankings_snapshots")
        .select("athlete_name, division, place, points, discipline, gender")
        .or(`athlete_name.ilike.%${athleteName}%,athlete_name.ilike.%${parts[0]}%`)
        .limit(50);
      rankingsData = data ?? [];

      const { data: results } = await sb.from("event_results")
        .select("athlete_name, event_name, division, place, score, event_date")
        .or(`athlete_name.ilike.%${athleteName}%,athlete_name.ilike.%${parts[0]}%`)
        .order("event_date", { ascending: false })
        .limit(20);
      eventResultsData = results ?? [];
    } else if (isEventQuestion && eventKeyword) {
      const { data } = await sb.from("event_results")
        .select("athlete_name, event_name, division, place, score, event_date")
        .ilike("event_name", '%' + eventKeyword + '%')
        .order("place", { ascending: true })
        .limit(100);
      eventResultsData = data ?? [];
    } else {
      const { data: r } = await sb.from("rankings_snapshots")
        .select("athlete_name, division, place, points")
        .order("place", { ascending: true })
        .limit(200);
      rankingsData = r ?? [];
    }

    const { data: events } = await sb.from("ifsa_events")
      .select("name, status, start_date, end_date, venue_name, location_text, stars, discipline, gender")
      .order("start_date", { ascending: false })
      .limit(100);

    const context = `
You are an AI assistant for the IFSA Junior Freeride Hub — a platform tracking U19 and U15 freeride ski and snowboard competitions.
Answer questions about athletes, events, and rankings using the data below.
Report findings directly and confidently. Never say an athlete or result is not found if it appears in the data.
If asked about event results or winners, use the EVENT RESULTS data.
If asked about rankings or standings, use the SEASON RANKINGS data.
Be concise and direct.

EVENTS (${events?.length ?? 0} total):
${JSON.stringify(events ?? [], null, 2)}

SEASON RANKINGS (${rankingsData.length} results):
${JSON.stringify(rankingsData, null, 2)}

EVENT RESULTS (${eventResultsData.length} results):
${JSON.stringify(eventResultsData, null, 2)}
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