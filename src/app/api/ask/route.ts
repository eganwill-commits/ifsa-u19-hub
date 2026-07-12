import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const STOP_WORDS = new Set(['who', 'what', 'where', 'when', 'how', 'the', 'at', 'in', 'for', 'did', 'won', 'win', 'place', 'finish', 'results', 'from', 'and', 'or', 'is', 'are', 'was', 'were', 'show', 'me', 'tell', 'get', 'give', 'find', 'does', 'has', 'have', 'his', 'her', 'their', 'ranking', 'rank', 'points', 'standing', 'division', 'event', 'competition', 'athlete', 'season', 'current', 'about', 'much', 'many', 'some', 'any', 'its', 'this', 'that', 'with', 'not', 'can', 'will', 'just', 'into', 'than', 'then', 'also', 'should', 'could', 'would', 'which', 'there', 'they', 'ifsa', 'junior', 'ski', 'snowboard', 'men', 'women', 'u19', 'u15', 'do', 'my', 'your', 'our', 'its', 'all', 'an', 'a', 'of', 'to', 'up', 'out', 'on', 'by', 'as', 'if', 'be', 'it', 'no', 'so']);

function getCandidateNames(question: string): string[] {
  const words = question.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z]/g, ''));
  const candidates: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (w1.length > 1 && w2.length > 1 && !STOP_WORDS.has(w1) && !STOP_WORDS.has(w2)) {
      candidates.push(w1 + ' ' + w2);
    }
  }
  return candidates;
}

function extractKeywords(question: string): string[] {
  return question.split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z]/g, ''))
    .filter(w => w.length > 3 && !STOP_WORDS.has(w.toLowerCase()));
}

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    const sb = supabaseServer();

    const candidates = getCandidateNames(question);
    const keywords = extractKeywords(question);
    const isEventQuestion = /who won|results|winner|podium|competed|finished|placed/.test(question.toLowerCase());

    let rankingsData: any[] = [];
    let eventResultsData: any[] = [];

    // Try each candidate name until we find a match
    for (const name of candidates) {
      const [{ data: rankings }, { data: results }] = await Promise.all([
        sb.from("rankings_snapshots")
          .select("athlete_name, division, place, points, discipline, gender")
          .ilike("athlete_name", '%' + name + '%')
          .limit(20),
        sb.from("event_results")
          .select("athlete_name, event_name, division, place, score, event_date")
          .ilike("athlete_name", '%' + name + '%')
          .order("event_date", { ascending: false })
          .limit(20),
      ]);

      if ((rankings && rankings.length > 0) || (results && results.length > 0)) {
        rankingsData = rankings ?? [];
        eventResultsData = results ?? [];
        break;
      }
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

    // Fall back to top rankings if nothing found
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
      model: "claude-sonnet-4-6",
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