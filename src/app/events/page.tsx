"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type EventRow = {
  id: string;
  name: string;
  stars: number | null;
  discipline: "ski" | "snowboard";
  gender: "men" | "women";
  division: "U12" | "U15" | "U19" | null;
  status: string | null;
  ifsa_url: string;
  updated_at: string;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  location_text: string | null;
};

type Filters = { discipline: string; division: string; stars: string; status: string; search: string; };

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; bar: string }> = {
  completed: { bg: "#0d1f0d", color: "#4caf50", border: "#1a3a1a", bar: "#4caf50" },
  upcoming:  { bg: "#0d1628", color: "#4a9edd", border: "#1a2a3a", bar: "#4a9edd" },
  drawn:     { bg: "#1a1a00", color: "#f0c040", border: "#3a3a00", bar: "#f0c040" },
  cancelled: { bg: "#1f0d0d", color: "#e05555", border: "#3a1a1a", bar: "#e05555" },
};

const DIVISION_COLORS: Record<string, string> = {
  U12: "#c084fc",
  U15: "#fb923c",
  U19: "#38bdf8",
};

const getStatus = (s: string | null) => STATUS_STYLES[s?.toLowerCase() ?? ""] ?? STATUS_STYLES.upcoming;

export default function EventsPage() {
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ discipline: "all", division: "all", stars: "all", status: "all", search: "" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ifsa_events").select("*").order("start_date", { ascending: true }).limit(500);
      setEvents((data || []) as EventRow[]);
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = events.filter((e) => {
    if (filters.discipline !== "all" && e.discipline !== filters.discipline) return false;
    if (filters.division !== "all" && (e.division ?? "U19") !== filters.division) return false;
    if (filters.stars !== "all" && String(e.stars) !== filters.stars) return false;
    if (filters.status !== "all" && (e.status ?? "upcoming") !== filters.status) return false;
    if (filters.search && !e.name.toLowerCase().includes(filters.search.toLowerCase()) && !(e.venue_name ?? "").toLowerCase().includes(filters.search.toLowerCase()) && !(e.location_text ?? "").toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const setFilter = (key: keyof Filters, value: string) => setFilters((f) => ({ ...f, [key]: value }));
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD";

  const upcomingCount = events.filter(e => (e.status ?? "upcoming") === "upcoming").length;
  const completedCount = events.filter(e => e.status === "completed").length;

  const FilterBtn = ({ label, filterKey, value }: { label: string; filterKey: keyof Filters; value: string }) => {
    const active = filters[filterKey] === value;
    return (
      <button onClick={() => setFilter(filterKey, value)} style={{ padding: "5px 12px", borderRadius: 999, border: active ? "1px solid #fff" : "1px solid #2a2a2a", background: active ? "rgba(255,255,255,0.12)" : "transparent", color: active ? "#fff" : "#aaa", fontSize: 12, cursor: "pointer", fontWeight: active ? 700 : 400, transition: "all 0.1s", whiteSpace: "nowrap", flexShrink: 0 }}>
        {label}
      </button>
    );
  };

  if (loading) return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: 16, fontFamily: "system-ui", color: "#e8e8e8" }}>
      <div style={{ color: "#aaa" }}>Loading events...</div>
    </main>
  );

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "system-ui", padding: "24px 16px 60px", color: "#e8e8e8" }}>
      <h1 style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800, marginBottom: 4 }}>IFSA Event Hub</h1>
      <p style={{ color: "#aaa", fontSize: 14, marginBottom: 16 }}>Freeride competitions for U12, U15, and U19 athletes.</p>

      <input
        type="text"
        placeholder="Search by event name, venue or location..."
        value={filters.search}
        onChange={e => setFilter("search", e.target.value)}
        style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "2px solid #ffcc00", background: "#0e0e0e", color: "#fff", fontSize: 15, fontFamily: "system-ui", marginBottom: 12, boxSizing: "border-box", outline: "none" }}
      />

      <div style={{ border: "1px solid #1e1e1e", borderRadius: 14, padding: "12px 14px", marginBottom: 16, background: "rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
          <span style={{ fontSize: 11, color: "#aaa", minWidth: 80, flexShrink: 0, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>Division</span>
          <FilterBtn label="All" filterKey="division" value="all" />
          <FilterBtn label="U12" filterKey="division" value="U12" />
          <FilterBtn label="U15" filterKey="division" value="U15" />
          <FilterBtn label="U19" filterKey="division" value="U19" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
          <span style={{ fontSize: 11, color: "#aaa", minWidth: 80, flexShrink: 0, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>Discipline</span>
          <FilterBtn label="All" filterKey="discipline" value="all" />
          <FilterBtn label="Ski" filterKey="discipline" value="ski" />
          <FilterBtn label="Snowboard" filterKey="discipline" value="snowboard" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
          <span style={{ fontSize: 11, color: "#aaa", minWidth: 80, flexShrink: 0, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>Stars</span>
          <FilterBtn label="All" filterKey="stars" value="all" />
          <FilterBtn label="2★" filterKey="stars" value="2" />
          <FilterBtn label="3★" filterKey="stars" value="3" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto" }}>
          <span style={{ fontSize: 11, color: "#aaa", minWidth: 80, flexShrink: 0, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>Status</span>
          <FilterBtn label="All" filterKey="status" value="all" />
          <FilterBtn label="Upcoming" filterKey="status" value="upcoming" />
          <FilterBtn label="Completed" filterKey="status" value="completed" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: "#aaa", fontSize: 13 }}>Showing {filtered.length} of {events.length} events</span>
        <span style={{ fontSize: 12, color: "#4a9edd", border: "1px solid #1a2a3a", borderRadius: 999, padding: "2px 10px" }}>{upcomingCount} upcoming</span>
        <span style={{ fontSize: 12, color: "#4caf50", border: "1px solid #1a3a1a", borderRadius: 999, padding: "2px 10px" }}>{completedCount} completed</span>
      </div>

      {filtered.length === 0 && <div style={{ color: "#aaa", fontSize: 14, fontStyle: "italic" }}>No events match your filters.</div>}

      <div style={{ display: "grid", gap: 8 }}>
        {filtered.map((e) => {
          const st = getStatus(e.status);
          const div = e.division ?? "U19";
          const divColor = DIVISION_COLORS[div] ?? "#aaa";
          return (
            <Link key={e.id} href={`/events/${e.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ border: "1px solid #1e1e1e", borderLeft: `3px solid ${st.bar}`, borderRadius: 12, padding: "12px 14px", background: "rgba(10,10,10,0.7)", transition: "background 0.1s" }}
                onMouseEnter={(ev) => { const s = e.status?.toLowerCase(); (ev.currentTarget as HTMLDivElement).style.background = s === "completed" ? "#0d6b0d" : s === "upcoming" ? "#0d3d78" : "#141414"; }}
                onMouseLeave={(ev) => { (ev.currentTarget as HTMLDivElement).style.background = "rgba(10,10,10,0.7)"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: st.bg, border: `1px solid ${st.border}`, color: st.color, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                        {e.status?.toUpperCase() ?? "UPCOMING"}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(0,0,0,0.4)", border: `1px solid ${divColor}`, color: divColor, fontFamily: "monospace" }}>
                        {div}
                      </span>
                      {e.stars && <span style={{ fontSize: 11, color: "#ffcc00", fontWeight: 700 }}>{e.stars}★</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "clamp(13px, 3vw, 15px)", lineHeight: 1.3, marginBottom: 3 }}>{e.name}</div>
                    <div style={{ fontSize: "clamp(11px, 2.5vw, 13px)", color: "#aaa" }}>
                      {fmtDate(e.start_date)}{e.end_date ? ` – ${fmtDate(e.end_date)}` : ""}
                      {e.venue_name ? ` · ${e.venue_name}` : ""}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
