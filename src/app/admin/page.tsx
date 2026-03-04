"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type EventRow = {
  id: string;
  name: string;
  discipline: "ski" | "snowboard";
  gender: "men" | "women";
  status: string | null;
  start_date: string | null;
  liveheats_url: string | null;
};

export default function AdminPage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, anon);
  }, []);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ifsa_events")
        .select("id,name,discipline,gender,status,start_date,liveheats_url")
        .order("start_date", { ascending: false });
      const rows = (data || []) as EventRow[];
      setEvents(rows);
      const initial: Record<string, string> = {};
      rows.forEach((e) => { initial[e.id] = e.liveheats_url || ""; });
      setInputs(initial);
      setLoading(false);
    })();
  }, [supabase]);

  const handleSave = async (id: string) => {
    setSaving((s) => ({ ...s, [id]: true }));
    await supabase
      .from("ifsa_events")
      .update({ liveheats_url: inputs[id] || null })
      .eq("id", id);
    setSaving((s) => ({ ...s, [id]: false }));
    setSaved((s) => ({ ...s, [id]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [id]: false })), 2000);
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD";

  const statusColor = (s: string | null) => {
    switch (s?.toLowerCase()) {
      case "completed": return "#6fcf6f";
      case "upcoming": return "#6faacf";
      case "cancelled": return "#cf6f6f";
      default: return "#cfcf6f";
    }
  };

  if (loading) return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui", color: "#e8e8e8" }}>
      <h1>Admin - LiveHeats URLs</h1>
      <div>Loading...</div>
    </main>
  );

  const completed = events.filter((e) => e.status === "completed");
  const other = events.filter((e) => e.status !== "completed");

  const renderEvent = (e: EventRow) => (
    <div key={e.id} style={{ border: "1px solid #2a2a2a", borderRadius: 14, padding: 16, marginBottom: 10, background: "#111" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{e.name}</div>
          <div style={{ fontSize: 13, color: "#777" }}>
            {fmtDate(e.start_date)} · {e.discipline.toUpperCase()} · {e.gender.toUpperCase()}
          </div>
        </div>
        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, border: "1px solid #333", color: statusColor(e.status), fontFamily: "monospace" }}>
          {e.status?.toUpperCase() ?? "UNKNOWN"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={inputs[e.id] ?? ""}
          onChange={(ev) => setInputs((i) => ({ ...i, [e.id]: ev.target.value }))}
          placeholder="https://liveheats.com/events/..."
          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #333", background: "#0e0e0e", color: "#e8e8e8", fontSize: 13, fontFamily: "monospace" }}
        />
        <button
          onClick={() => handleSave(e.id)}
          disabled={saving[e.id]}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: saved[e.id] ? "#2d6a2d" : "#1a2a3a", color: saved[e.id] ? "#6fcf6f" : "#6faacf", fontWeight: 700, cursor: "pointer", fontSize: 13, minWidth: 70 }}
        >
          {saving[e.id] ? "..." : saved[e.id] ? "Saved!" : "Save"}
        </button>
      </div>
    </div>
  );

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: "0 16px 60px", fontFamily: "system-ui", color: "#e8e8e8" }}>
      <h1 style={{ marginBottom: 4 }}>Admin - LiveHeats URLs</h1>
      <p style={{ color: "#666", fontSize: 14, marginBottom: 32 }}>
        Paste LiveHeats event URLs for each event. They will appear as embedded results on the event detail page.
      </p>

      <h2 style={{ fontSize: 16, color: "#6fcf6f", marginBottom: 12 }}>Completed Events ({completed.length})</h2>
      {completed.map(renderEvent)}

      <h2 style={{ fontSize: 16, color: "#6faacf", marginBottom: 12, marginTop: 32 }}>Upcoming / Other Events ({other.length})</h2>
      {other.map(renderEvent)}
    </main>
  );
}
