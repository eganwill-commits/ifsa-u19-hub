import type { LiveHeatsEvent, LiveHeatsDivision } from "@/lib/liveheats";

const PLACE_COLORS: Record<number, string> = {
  1: "#ffcc00",
  2: "#d0d0d0",
  3: "#cd7f32",
};

function fmtScore(total: number | null): string {
  if (total == null) return "—";
  return Number.isInteger(total) ? String(total) : total.toFixed(2);
}

function ResultsTable({ results }: { results: LiveHeatsDivision["results"] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#555", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase" }}>
            <th style={{ padding: "6px 10px", width: 56 }}>Place</th>
            <th style={{ padding: "6px 10px" }}>Athlete</th>
            <th style={{ padding: "6px 10px", width: 90, textAlign: "right" }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const color = PLACE_COLORS[r.place] ?? "#e8e8e8";
            return (
              <tr key={`${r.athleteId ?? r.name}-${i}`} style={{ borderTop: "1px solid #1e1e1e" }}>
                <td style={{ padding: "8px 10px", fontWeight: 800, fontFamily: "monospace", color }}>
                  {r.place}
                </td>
                <td style={{ padding: "8px 10px", fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", color: "#aaa", fontFamily: "monospace" }}>
                  {fmtScore(r.total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EntryList({ entries }: { entries: LiveHeatsDivision["entries"] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "4px 16px" }}>
      {entries.map((en, i) => (
        <div
          key={`${en.athleteId ?? en.name}-${i}`}
          style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "5px 0", borderTop: i > 0 ? "1px solid #141414" : "none" }}
        >
          <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace", minWidth: 20, textAlign: "right" }}>{i + 1}</span>
          <span style={{ fontSize: 14 }}>{en.name}</span>
        </div>
      ))}
    </div>
  );
}

function DivisionBlock({ division }: { division: LiveHeatsDivision }) {
  const hasResults = division.results.length > 0;
  const count = hasResults ? division.results.length : division.entries.length;
  const highlight = !!division.isEventDivision;
  return (
    <div style={{ borderTop: "1px solid #2a2a2a", background: highlight ? "rgba(255,204,0,0.05)" : "transparent", borderLeft: highlight ? "3px solid #ffcc00" : "3px solid transparent" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 20px 10px", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {division.name}
          {highlight && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "#ffcc00", border: "1px solid #ffcc00", borderRadius: 999, padding: "2px 7px", fontFamily: "monospace", letterSpacing: 1 }}>
              THIS DIVISION
            </span>
          )}
        </h3>
        <span style={{ fontSize: 11, color: "#aaa", fontFamily: "monospace" }}>
          {count} {hasResults ? (count === 1 ? "result" : "results") : count === 1 ? "athlete" : "athletes"}
        </span>
      </div>
      <div style={{ padding: "0 12px 16px" }}>
        {hasResults ? <ResultsTable results={division.results} /> : <div style={{ padding: "0 8px" }}><EntryList entries={division.entries} /></div>}
      </div>
    </div>
  );
}

export default function EventLiveHeats({ data }: { data: LiveHeatsEvent }) {
  const anyResults = data.divisions.some((d) => d.results.length > 0);
  const title = anyResults ? "Results" : "Entry List";

  return (
    <div style={{ border: "1px solid #2a2a2a", borderRadius: 16, overflow: "hidden", background: "rgba(10,10,10,0.8)", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "16px 20px", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h2>
        <span style={{ fontSize: 10, color: "#4caf50", fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", border: "1px solid #1a3a1a", background: "#0d1f0d", borderRadius: 999, padding: "3px 10px" }}>
          Live from LiveHeats
        </span>
      </div>
      {data.divisions.map((d) => (
        <DivisionBlock key={d.id} division={d} />
      ))}
    </div>
  );
}
