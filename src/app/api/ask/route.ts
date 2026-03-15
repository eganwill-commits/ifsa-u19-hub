import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractName(question: string): string | null {
  const stopWords = new Set(['who', 'what', 'where', 'when', 'how', 'the', 'at', 'in', 'for', 'did', 'won', 'win', 'place', 'finish', 'results', 'from', 'and', 'or', 'is', 'are', 'was', 'were', 'show', 'me', 'tell', 'get', 'give', 'find', 'does', 'has', 'have', 'his', 'her', 'their', 'ranking', 'rank', 'points', 'standing', 'division', 'event', 'competition']);
  const words = question.split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i].replace(/[^a-zA-Z]/g, '');
    const w2 = words[i + 1].replace(/[^a-zA-Z]/g, '');
    if (
      w1.length > 1 && w2.length > 1 &&
      w1[0] === w1[0].toUpperCase() &&
      w2[0] === w2[0].toUpperCase() &&
      !stopWords.has(w1.toLowerCase()) &&
      !stopWords.has(w2.toLowerCase())
    ) {
      return w1 + ' ' + w2;
    }
  }
  return null;
}

function extractKeywords(question: string): string[] {
  const stopWords = new Set(['who', 'what', 'where', 'when', 'how', 'the', 'at', 'in', 'for', 'did', 'won', 'win', 'place', 'finish', 'results', 'from', 'and', 'or', 'is', 'are', 'was', 'were', 'show', 'me', 'tell', 'get', 'give', 'find', 'does', 'has', 'have']);
  return question.split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z]/g, ''))
    .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
}

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    const sb = supabaseServer();

    const athleteName = extractName(question);
    const keywords = extractKeywords(question);
    const isEventQuestion = /who won|results|winner|podium|competed|finished|placed/.test(question.toLowerCase());

    let rankingsData: any[] = [];
    let eventResultsData: any[] = [];

    if (athleteName) {
      // Always search by full name first
      const [{ data: rankings }, { data: results }] = await Promise.all([
        sb.from("rankings_snapshots")
          .select("athlete_name, division, place, points, discipline, gender")
          .ilike("athlete_name", '%' + athleteName + '%')
          .limit(20),
        sb.from("event_results")
          .select("athlete_name, event_name, division, place, score, event_date")
          .ilike("athlete_name", '%' + athleteName + '%')
          .order("event_date", { ascending: false })
          .limit(20),
      ]);
      rankingsData = rankings ?? [];
      eventResultsData = results ?? [];
    }

    // Search event results by keyword if it looks like an event question
    if (isEventQuestion && eventResultsData.length === 0 && keywords.length > 0) {
      for (const kw of keywords) {
        if (kw.length < 4) continue;
        const { data } = await sb.from("event_results")
          .select("athlete_name, event_name, division, place, score, event_date")
          .ilike("event_name", '%' + kw + '%')
          .order("place", { ascending: true })
          .limit(100);
        if (data && data.length > 0) {
          eventResultsData = data;
          break;
        }
      }
    }

    // Fall back to top rankings if nothing specific found
    if (rankingsData.length === 0 && eventResultsData.length === 0) {
      const { data } = await sb.from("rankings_snapshots")
        .select("athlete_name, division, place, points")
        .order("place", { ascending: true })
        .limit(100);
      rankingsData = data ?? [];
    }

    const { data: events } = await sb.from("ifsa_events")
      .select("name, status, start_date, end_date, venue_name, location_text, stars, discipline, gender")
      .order("start_date", { ascending: false })
      .limit(100);

    const context = `
You are an AI assistant for the IFSA Junior Freeride Hub — a platform tracking U19 and U15 freeride ski and snowboard competitions.
Answer questions about athletes, events, and rankings using the data below.
Report findings directly and confidently. Never say results are unavailable if they appear in the data.
If asked about a specific athlete, report ALL divisions and events they appear in.
If asked about event results or winners, use EVENT RESULTS data.
If asked about season rankings or standings, use SEASON RANKINGS data.
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