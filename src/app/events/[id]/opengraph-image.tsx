// Share card for an event: what shows when a link is pasted into a group chat.
import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "IFSA event";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: e } = await sb.from("ifsa_events")
    .select("name,start_date,end_date,venue_name,location_text,stars,status")
    .eq("id", id).maybeSingle();
  const d = (x: string | null) => x ? new Date(x + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "Date TBD";
  const name = e?.name ?? "IFSA Junior Freeride";
  const dates = e ? (e.end_date && e.end_date !== e.start_date ? `${d(e.start_date)} – ${d(e.end_date)}` : d(e.start_date)) : "";
  const where = e ? [e.venue_name, e.location_text].filter(Boolean).join(" · ") : "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0a0a", color: "#fff", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 800 }}>
          IFSA Event <span style={{ color: "#ffcc00", marginLeft: 10 }}>Hub</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {e?.stars ? <div style={{ display: "flex", fontSize: 34, color: "#ffcc00", marginBottom: 16 }}>{"★".repeat(e.stars)}</div> : null}
          <div style={{ display: "flex", fontSize: name.length > 40 ? 58 : 72, fontWeight: 900, lineHeight: 1.05 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 34, color: "#ccc", marginTop: 24 }}>{dates}</div>
          {where ? <div style={{ display: "flex", fontSize: 30, color: "#888", marginTop: 8 }}>{where}</div> : null}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#777" }}>Entries · results · registration · weather · links</div>
      </div>
    ),
    size,
  );
}
