// Tiny, safe markdown renderer for assistant replies: headings, bullets, rules,
// **bold**, *italic*, `code` and [links](url). Builds React elements (no HTML
// injection) so model output can never inject markup.
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
  lines.forEach((raw, n) => {
    const line = raw.trimEnd();
    const k = `l${n}`;
    const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) { list.push(<li key={k}>{inline(bullet[1], k)}</li>); return; }
    flush();
    if (!line.trim()) { blocks.push(<div key={k} style={{ height: 6 }} />); return; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push(<hr key={k} style={{ border: 0, borderTop: "1px solid #333", margin: "6px 0" }} />); return; }
    const h = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (h) { blocks.push(<div key={k} style={{ fontWeight: 800, marginTop: 4 }}>{inline(h[1], k)}</div>); return; }
    blocks.push(<div key={k}>{inline(line, k)}</div>);
  });
  flush();
  return <Fragment>{blocks}</Fragment>;
}
