import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import Anthropic from "@anthropic-ai/sdk";
import { compListCutoff, seasonOf } from "@/lib/season";

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
        sb.from("rankings_current")
          .select("athlete_name, division, place, points, discipline, gender, series_name")
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
      const { data } = await sb.from("rankings_current")
        .select("athlete_name, division, discipline, gender, place, points, series_name")
        .lte("place", 10)
        .order("place", { ascending: true })
        .limit(100);
      rankingsData = data ?? [];
    }

    // One line per competition (rows are per division), current + last season,
    // with registration windows and links so it can answer "when does reg open".
    const { data: eventRows } = await sb.from("ifsa_events")
      .select("name, status, start_date, end_date, venue_name, location_text, stars, division, ifsa_url, liveheats_url, event_guide_url, registration_opens, registration_closes, venue_website, contact_email, ifsa_region")
      .eq("hidden", false)
      .gte("start_date", compListCutoff())
      .order("start_date", { ascending: true })
      .limit(1000);
    const comps = new Map<string, any>();
    for (const r of eventRows ?? []) {
      const k = r.ifsa_url || r.name;
      const c = comps.get(k);
      if (c) { if (r.division && !c.divisions.includes(r.division)) c.divisions.push(r.division); continue; }
      const { division, ...rest } = r;
      comps.set(k, { ...rest, divisions: division ? [division] : [] });
    }
    // Keep the prompt lean: finished comps only need what/where/when + results link.
    const events = [...comps.values()].map((c) => {
      if (c.status !== "completed" && c.status !== "cancelled") return c;
      const { event_guide_url, registration_opens, registration_closes, venue_website, contact_email, ifsa_region, ifsa_url, ...slim } = c;
      return slim;
    });
    const today = new Date();

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

TODAY: ${today.toISOString().slice(0, 10)}. CURRENT SEASON: ${seasonOf(today)} (IFSA seasons run July-June and are named for the year they end).
RANKINGS: there is ONE current junior ranking series covering all regions (named in series_name below) — do not split it into "North American" vs "South American" rankings. Only quote rankings from the data below; never quote last season's standings as current.
REGISTRATION: registration_opens / registration_closes are UTC timestamps; state them in Mountain Time and say registration happens on LiveHeats (link the event's liveheats_url). Athletes need active IFSA + regional memberships first.
LINKS: when you mention a specific event, link its event_guide_url, ifsa_url or liveheats_url where available. Keep answers short — this is a small chat panel on a phone.

EVENTS (${events.length} competitions, current + last season):
${JSON.stringify(events)}

CURRENT-SEASON RANKINGS (${rankingsData.length} rows):
${JSON.stringify(rankingsData)}

EVENT RESULTS (${eventResultsData.length} rows):
${JSON.stringify(eventResultsData)}
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
