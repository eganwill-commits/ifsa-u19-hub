import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    const sb = supabaseServer();

    // Pull relevant data from Supabase
    const [{ data: events }, { data: athletes }, { data: rankings }] = await Promise.all([
      sb.from("ifsa_events").select("name, status, start_date, end_date, venue_name, location_text, stars, discipline, gender").order("start_date", { ascending: false }).limit(200),
      sb.from("athletes").select("*").limit(500),
      sb.from("rankings").select("*").limit(500),
    ]);

    const context = `
You are an AI assistant for the IFSA Junior Freeride Hub — a platform tracking U19 freeride ski and snowboard competitions.
Answer questions about athletes, events, rankings, and results using the data below.
Be concise and helpful. If you don't know something or it's not in the data, say so clearly.

EVENTS:
${JSON.stringify(events ?? [], null, 2)}

ATHLETES:
${JSON.stringify(athletes ?? [], null, 2)}

RANKINGS:
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