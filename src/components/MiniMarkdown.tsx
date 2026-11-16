// Tiny, safe markdown renderer for assistant replies: headings, bullets, rules,
// tables, > quotes/notes, **bold**, *italic*, `code` and [links](url). Builds React elements (no
// HTML injection) so model output can never inject markup.
import { Fragment, type ReactNode } from "react";

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)|`[^`]+`|\*[^*\s][^*]*\*|https?:\/\/[^\s)]+)/g;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const tok = m[0];
    const k = `${key}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("[")) {
      const label = tok.slice(1, tok.indexOf("]("));
      const href = tok.slice(tok.indexOf("](") + 2, -1);
      out.push(<a key={k} href={href} target={href.startsWith("/") ? undefined : "_blank"} rel="noreferrer" style={{ color: "#ffcc00" }}>{label}</a>);
    } else if (tok.startsWith("`")) out.push(<code key={k} style={{ background: "#000", padding: "0 4px", borderRadius: 4 }}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("http")) out.push(<a key={k} href={tok} target="_blank" rel="noreferrer" style={{ color: "#ffcc00", wordBreak: "break-all" }}>{tok}</a>);
    else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// --- Tables ----------------------------------------------------------------
// GitHub-style: a header row, a separator row (| --- | :---: |), then body rows.
// Leading/trailing pipes are optional, as in most model output.
const isTableRow = (l: string) => /\|/.test(l) && l.trim().length > 1;
const isSeparator = (l: string) =>
  /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(l) || /^\s*\|\s*:?-{2,}:?\s*\|\s*$/.test(l);

function splitRow(l: string): string[] {
  let s = l.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function alignments(sep: string): ("left" | "right" | "center")[] {
  return splitRow(sep).map((c) =>
    c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : "left");
}

function Table({ header, align, rows, k }: { header: string[]; align: ("left" | "right" | "center")[]; rows: string[][]; k: string }) {
  const cols = header.length;
  const cell = (i: number) => ({
    padding: "5px 8px",
    textAlign: align[i] ?? "left",
    verticalAlign: "top" as const,
  });
  return (
    <div style={{ overflowX: "auto", margin: "6px 0", border: "1px solid #2a2a2a", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, lineHeight: 1.35 }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.04)" }}>
            {header.map((h, i) => (
              <th key={i} style={{ ...cell(i), fontSize: 11, color: "#999", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>
                {inline(h, `${k}-h${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} style={{ borderTop: "1px solid #222" }}>
              {Array.from({ length: cols }, (_, ci) => (
                <td key={ci} style={cell(ci)}>{inline(r[ci] ?? "", `${k}-${ri}-${ci}`)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MiniMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(<ul key={`ul-${blocks.length}`} style={{ margin: "4px 0", paddingLeft: 18 }}>{list}</ul>);
      list = [];
    }
  };

  for (let n = 0; n < lines.length; n++) {
    const line = lines[n].trimEnd();
    const k = `l${n}`;

    // Table: header row immediately followed by a separator row.
    if (isTableRow(line) && n + 1 < lines.length && isSeparator(lines[n + 1])) {
      flush();
      const header = splitRow(line);
      const align = alignments(lines[n + 1]);
      const rows: string[][] = [];
      let j = n + 2;
      while (j < lines.length && isTableRow(lines[j]) && !isSeparator(lines[j])) {
        rows.push(splitRow(lines[j]));
        j++;
      }
      blocks.push(<Table key={k} k={k} header={header} align={align} rows={rows} />);
      n = j - 1;
      continue;
    }

    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) { list.push(<li key={k}>{inline(bullet[1], k)}</li>); continue; }
    flush();
    if (!line.trim()) { blocks.push(<div key={k} style={{ height: 6 }} />); continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push(<hr key={k} style={{ border: 0, borderTop: "1px solid #333", margin: "6px 0" }} />); continue; }
    // "> Note: …" — consecutive quote lines become one callout block.
    if (/^\s*>/.test(line)) {
      const quoted: string[] = [];
      let j = n;
      while (j < lines.length && /^\s*>/.test(lines[j])) { quoted.push(lines[j].replace(/^\s*>\s?/, "")); j++; }
      blocks.push(
        <div key={k} style={{ borderLeft: "3px solid #ffcc00", background: "rgba(255,204,0,0.06)", padding: "6px 10px", margin: "6px 0", borderRadius: "0 8px 8px 0", color: "#ccc", fontSize: 13 }}>
          {quoted.map((q, qi) => <div key={qi}>{inline(q, `${k}-q${qi}`)}</div>)}
        </div>,
      );
      n = j - 1;
      continue;
    }
    const h = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (h) { blocks.push(<div key={k} style={{ fontWeight: 800, marginTop: 4 }}>{inline(h[1], k)}</div>); continue; }
    blocks.push(<div key={k}>{inline(line, k)}</div>);
  }
  flush();
  return <Fragment>{blocks}</Fragment>;
}
