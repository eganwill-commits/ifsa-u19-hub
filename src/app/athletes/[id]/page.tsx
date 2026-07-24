import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type ResultRow = {
  event_name: string | null;
  division: string | null;
  place: number | null;
  score: string | null;
  stars: number | null;
  event_date: string | null;
  ifsa_event_id: string | null;
};

const PLACE_COLORS: Record<number, string> = {
  1: "#ffcc00",
  2: "#d0d0d0",
  3: "#cd7f32",
};

export default async function AthleteProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [{ data: athlete }, { data: resultsData }] = await Promise.all([
    supabase.from("athletes").select("id,name,liveheats_url").eq("id", id).single(),
    supabase
      .from("event_results")
      .select("event_name,division,place,score,stars,event_date,ifsa_event_id")
      .eq("athlete_id", id)
      .order("event_date", { ascending: false, nullsFirst: false }),
  ]);

  const results = (resultsData ?? []) as ResultRow[];

  if (!athlete && results.length === 0) return notFound();
  const displayName = athlete?.name ?? null;

  const podiums = results.filter((r) => r.place != null && r.place <= 3).length;
  const wins = results.filter((r) => r.place === 1).length;
  const bestPlace = results.reduce<number | null>(
    (best, r) => (r.place != null && (best == null || r.place < best) ? r.place : best),
    null
  );

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—";

  const stats: { label: string; value: string }[] = [
    { label: "RESULTS", value: String(results.length) },
    { label: "WINS", value: String(wins) },
    { label: "PODIUMS", value: String(podiums) },
    { label: "BEST FINISH", value: bestPlace != null ? `${bestPlace}${ordinal(bestPlace)}` : "—" },
  ];

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 60px", fontFamily: "system-ui", color: "#e8e8e8" }}>
      <a href="/athletes" style={{ color: "#aaa", textDecoration: "none", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
        ← Back to Athletes
      </a>

      <div style={{ border: "1px solid #2a2a2a", borderRadius: 16, padding: "20px", marginBottom: 16, background: "rgba(10,10,10,0.8)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800, margin: 0 }}>
            {displayName ?? "Athlete"}
          </h1>
          {athlete?.liveheats_url && (
            <a href={athlete.liveheats_url} target="_blank" rel="noreferrer"
              style={{ fontSize: 13, color: "#aaa", border: "1px solid #333", borderRadius: 8, padding: "6px 14px", textDecoration: "none" }}>
              LiveHeats Profile ↗
            </a>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginTop: 16 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ border: "1px solid #2a2a2a", borderRadius: 12, padding: "12px 14px", background: "rgba(0,0,0,0.4)" }}>
              <div style={{ fontSize: 10, color: "#555", fontFamily: "monospace", letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ border: "1px solid #2a2a2a", borderRadius: 16, overflow: "hidden", background: "rgba(10,10,10,0.8)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #2a2a2a" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Results</h2>
        </div>
        {results.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "#777", fontSize: 13 }}>
            No results recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#555", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase" }}>
                  <th style={{ padding: "8px 16px", width: 60 }}>Place</th>
                  <th style={{ padding: "8px 16px" }}>Event</th>
                  <th style={{ padding: "8px 16px" }}>Division</th>
                  <th style={{ padding: "8px 16px", width: 80, textAlign: "right" }}>Score</th>
                  <th style={{ padding: "8px 16px", width: 110, textAlign: "right" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const color = r.place != null ? PLACE_COLORS[r.place] ?? "#e8e8e8" : "#777";
                  return (
                    <tr key={i} style={{ borderTop: "1px solid #1e1e1e" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 800, fontFamily: "monospace", color }}>
                        {r.place != null ? `${r.place}` : "—"}
                      </td>
                      <td style={{ padding: "10px 16px", fontWeight: 600 }}>
                        {r.ifsa_event_id ? (
                          <a href={`/events/${r.ifsa_event_id}`} style={{ color: "#e8e8e8", textDecoration: "none" }}>
                            {r.event_name ?? "Event"}
                          </a>
                        ) : (
                          r.event_name ?? "Event"
                        )}
                        {r.stars ? <span style={{ color: "#ffcc00", fontSize: 12, marginLeft: 6 }}>{r.stars}★</span> : null}
                      </td>
                      <td style={{ padding: "10px 16px", color: "#aaa", fontSize: 13 }}>{r.division ?? "—"}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#aaa", fontFamily: "monospace" }}>{r.score ?? "—"}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: "#aaa", fontSize: 13, whiteSpace: "nowrap" }}>{fmtDate(r.event_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
