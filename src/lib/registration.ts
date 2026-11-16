// Registration window helpers. IFSA publishes a start/close time per event
// (synced into ifsa_events.registration_opens / registration_closes); entries
// themselves happen on LiveHeats.

export type RegState = "not_yet" | "open" | "closed";

export type RegInfo = {
  state: RegState;
  opens: Date | null;
  closes: Date | null;
};

export function registrationInfo(
  opens: string | null | undefined,
  closes: string | null | undefined,
  now: Date = new Date(),
): RegInfo | null {
  const o = opens ? new Date(opens) : null;
  const c = closes ? new Date(closes) : null;
  if (!o && !c) return null;
  let state: RegState;
  if (o && now < o) state = "not_yet";
  else if (c && now >= c) state = "closed";
  else state = "open";
  return { state, opens: o, closes: c };
}

/** "Dec 8, 7:00 PM MST" — the viewer's zone by default, or a fixed zone (stable for SSR). */
export function fmtRegTime(d: Date | null, timeZone?: string): string {
  if (!d) return "TBD";
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
    ...(timeZone ? { timeZone } : {}),
  });
}

/** Short label for list cards. */
export function regBadgeLabel(info: RegInfo): string {
  if (info.state === "open") return info.closes ? `Reg open · closes ${shortDate(info.closes)}` : "Registration open";
  if (info.state === "not_yet") return info.opens ? `Reg opens ${shortDate(info.opens)}` : "Registration soon";
  return "Reg closed";
}

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
