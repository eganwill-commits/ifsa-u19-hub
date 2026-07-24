import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import WeatherPanel from "@/components/WeatherPanel";
import EventLiveHeats from "@/components/EventLiveHeats";
import AutoRefresh from "@/components/AutoRefresh";
import { getLiveHeatsEvent, getMatchedLiveHeatsEventId, parseLiveheatsEventId, competitorDivisions } from "@/lib/liveheats";

type EventRow = {
  id: string;
  name: string;
  stars: number | null;
  discipline: string;
  gender: string;
  division: string | null;
  status: string | null;
  ifsa_url: string;
  liveheats_url: string | null;
  event_guide_url: string | null;
  updated_at: string;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  location_text: string | null;
  lat: number | null;
  lon: number | null;
};

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  completed: { bg: "#0d1f0d", color: "#4caf50", border: "#1a3a1a" },
  upcoming:  { bg: "#0d1628", color: "#4a9edd", border: "#1a2a3a" },
  drawn:     { bg: "#1a1a00", color: "#f0c040", border: "#3a3a00" },
  cancelled: { bg: "#1f0d0d", color: "#e05555", border: "#3a1a1a" },
};

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: event } = await supabase.from("ifsa_events").select("*").eq("id", id).single();
  if (!event) return notFound();
  const e = event as EventRow;

  // Pull entry list + results live from LiveHeats (cached ~60s), narrowed to
  // this event's division/discipline/gender. If the event has no stored
  // liveheats_url yet, resolve it on the fly by name so the page still works.
  const lhId = parseLiveheatsEventId(e.liveheats_url) ?? (await getMatchedLiveHeatsEventId(e.name));
  const liveheats = lhId ? await getLiveHeatsEvent(lhId) : null;
  const lhDivisions = liveheats
    ? competitorDivisions(liveheats.divisions, { division: e.division, discipline: e.discipline, gender: e.gender })
    : [];
  const hasLiveData = !!liveheats && lhDivisions.length > 0;

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "TBD";
  const st = STATUS_COLORS[e.status?.toLowerCase() ?? ""] ?? STATUS_COLORS.upcoming;

  // "Live" = the event window includes today and it isn't finished/cancelled.
  const todayYmd = new Date().toISOString().slice(0, 10);
  const isLive = !!e.start_date
    && e.status !== "completed" && e.status !== "cancelled"
    && todayYmd >= e.start_date
    && todayYmd <= (e.end_date ?? e.start_date);

  const daysBetween = e.start_date && e.end_date
    ? Math.round((new Date(e.end_date).getTime() - new Date(e.start_date).getTime()) / 86400000) + 1
    : null;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 60px", fontFamily: "system-ui", color: "#e8e8e8" }}>
      {isLive ? <AutoRefresh intervalMs={30000} /> : (e.status !== "completed" && hasLiveData ? <AutoRefresh intervalMs={120000} /> : null)}
      <a href="/events" style={{ color: "#aaa", textDecoration: "none", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
        ← Back to Events
      </a>

      <div style={{ border: "1px solid #2a2a2a", borderRadius: 16, padding: "20px 20px", marginBottom: 16, background: "rgba(10,10,10,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isLive && (
              <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: "#2a0d0d", border: "1px solid #e05555", color: "#ff6b6b", fontFamily: "monospace", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: "#ff3b3b", display: "inline-block" }} />
                LIVE
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: st.bg, border: `1px solid ${st.border}`, color: st.color, fontFamily: "monospace" }}>
              {e.status?.toUpperCase() ?? "UPCOMING"}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, border: "1px solid #333", color: "#ffcc00" }}>
              {e.stars} star
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {e.event_guide_url && (
              <a href={e.event_guide_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 13, color: "#ffcc00", border: "1px solid #ffcc00", borderRadius: 8, padding: "6px 14px", textDecoration: "none" }}>
                Event Guide ↗
              </a>
            )}
            <a href={e.ifsa_url} target="_blank" rel="noreferrer"
              style={{ fontSize: 13, color: "#aaa", border: "1px solid #333", borderRadius: 8, padding: "6px 14px", textDecoration: "none" }}>
              View on IFSA ↗
            </a>
            {e.liveheats_url && (
              <a href={e.liveheats_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 13, color: "#aaa", border: "1px solid #333", borderRadius: 8, padding: "6px 14px", textDecoration: "none" }}>
                View on LiveHeats ↗
              </a>
            )}
          </div>
        </div>

        <h1 style={{ fontSize: "clamp(18px, 5vw, 26px)", fontWeight: 800, margin: "0 0 12px" }}>{e.name}</h1>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[e.discipline, e.gender, e.division ?? "U19"].map(tag => (
            <span key={tag} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, border: "1px solid #2a2a2a", color: "#aaa", fontFamily: "monospace", textTransform: "uppercase" }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { label: "DATES", main: fmtDate(e.start_date), sub: e.end_date ? `to ${fmtDate(e.end_date)}` : null, sub2: daysBetween ? `${daysBetween} days` : null },
          { label: "VENUE", main: e.venue_name ?? "TBD", sub: e.location_text ?? null, sub2: null },
          { label: "LAST UPDATED", main: new Date(e.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), sub: new Date(e.updated_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), sub2: null },
        ].map(card => (
          <div key={card.label} style={{ border: "1px solid #2a2a2a", borderRadius: 12, padding: "14px 16px", background: "rgba(10,10,10,0.8)" }}>
            <div style={{ fontSize: 10, color: "#555", fontFamily: "monospace", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>{card.label}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{card.main}</div>
            {card.sub && <div style={{ fontSize: 12, color: "#aaa" }}>{card.sub}</div>}
            {card.sub2 && <div style={{ fontSize: 12, color: "#aaa" }}>{card.sub2}</div>}
          </div>
        ))}
      </div>

      {e.lat && e.lon && (
        <div style={{ border: "1px solid #2a2a2a", borderRadius: 16, padding: "20px", marginBottom: 16, background: "rgba(10,10,10,0.8)" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>
            Resort Weather
            {e.location_text && <span style={{ fontSize: 12, color: "#555", fontWeight: 400, marginLeft: 8 }}>{e.location_text}</span>}
          </h2>
          <WeatherPanel lat={e.lat} lon={e.lon} />
        </div>
      )}

      {hasLiveData ? (
        <EventLiveHeats data={{ ...liveheats!, divisions: lhDivisions }} />
      ) : (
        <div style={{ border: "1px solid #2a2a2a", borderRadius: 16, overflow: "hidden", background: "rgba(10,10,10,0.8)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #2a2a2a" }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Results and Scoring</h2>
          </div>
          {e.liveheats_url ? (
            <iframe
              src={e.liveheats_url}
              style={{ width: "100%", height: "clamp(400px, 80vw, 700px)", border: "none", background: "#fff", display: "block" }}
              title="LiveHeats Results"
            />
          ) : (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <span style={{ fontSize: 12, color: "#555", border: "1px solid #2a2a2a", borderRadius: 8, padding: "6px 14px" }}>
                Results Coming Soon
              </span>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
