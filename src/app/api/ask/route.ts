import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const STOP_WORDS = new Set(['who', 'what', 'where', 'when', 'how', 'the', 'at', 'in', 'for', 'did', 'won', 'win', 'place', 'finish', 'results', 'from', 'and', 'or', 'is', 'are', 'was', 'were', 'show', 'me', 'tell', 'get', 'give', 'find', 'does', 'has', 'have', 'his', 'her', 'their', 'ranking', 'rank', 'points', 'standing', 'division', 'event', 'competition', 'athlete', 'season', 'current', 'about', 'much', 'many', 'some', 'any', 'its', 'this', 'that', 'with', 'not', 'can', 'will', 'just', 'into', 'than', 'then', 'also', 'should', 'could', 'would', 'which', 'there', 'they', 'ifsa', 'junior', 'ski', 'snowboard', 'men', 'women', 'u19', 'u15', 'u12', 'do', 'my', 'your', 'our', 'its', 'all', 'an', 'a', 'of', 'to', 'up', 'out', 'on', 'by', 'as', 'if', 'be', 'it', 'no', 'so']);

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

    if (rankingsData.length === 0 && eventResultsData.length === 0) {
      const { data } = await sb.from("rankings_snapshots")
        .select("athlete_name, division, place, points")
        .order("place", { ascending: true })
        .limit(100);
      rankingsData = data ?? [];
    }

    const { data: events } = await sb.from("ifsa_events")
      .select("name, status, start_date, end_date, venue_name, location_text, stars, discipline, gender, division")
      .order("start_date", { ascending: false })
      .limit(200);

    const context = `
You are the IFSA Hub AI Assistant — an expert on everything related to IFSA (International Freeskiers & Snowboarders Association) junior freeride competition.

Your knowledge covers:
- IFSA junior freeride events worldwide (U12, U15, U19) including North America and South America
- Event schedules, dates, venues, locations, star ratings (2★, 3★), and status
- Athlete rankings, results, and standings
- IFSA rules, judging criteria, qualification requirements, and competition formats
- How athletes qualify for the Junior Freeride Championship
- Star rating system (1★ through 4★) and what each means
- Division structure (U12, U15, U19) and age cutoffs
- Disciplines (ski and snowboard) and gender categories
- South American season (July–September) and North American season (November–April)
- IFSA membership, registration, and coach certification
- General freeride skiing and snowboarding knowledge

Use the database data below for specific events, athletes, and rankings. For questions about rules, history, qualification, judging, or anything not in the database, draw on your broader knowledge of IFSA and freeride competition.

Be conversational, helpful, and direct. If you don't know something specific, say so and point them to ifsafreeride.org.

EVENTS IN DATABASE (${events?.length ?? 0} total):
${JSON.stringify(events ?? [], null, 2)}

SEASON RANKINGS (${rankingsData.length} results):
${JSON.stringify(rankingsData, null, 2)}

EVENT RESULTS (${eventResultsData.length} results):
${JSON.stringify(eventResultsData, null, 2)}
    `.trim();

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: context,
      messages: [{ role: "user", content: question }],
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
        } as any,
      ],
    });

    // Extract text from response, handling tool use blocks
    let text = "";
    for (const block of message.content) {
      if (block.type === "text") text += block.text;
    }

    if (!text) text = "Sorry, I could not generate a response.";

    return NextResponse.json({ ok: true, answer: text });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}
