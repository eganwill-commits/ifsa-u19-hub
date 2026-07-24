import { unstable_cache } from "next/cache";

const LIVEHEATS_GRAPHQL = "https://liveheats.com/api/graphql";

export type LiveHeatsEntry = {
  athleteId: string | null;
  name: string;
};

export type LiveHeatsResult = {
  place: number;
  total: number | null;
  athleteId: string | null;
  name: string;
};

export type LiveHeatsDivision = {
  id: string;
  name: string;
  entries: LiveHeatsEntry[];
  results: LiveHeatsResult[];
  /** True when this division matches the IFSA event's own category. */
  isEventDivision?: boolean;
};

export type LiveHeatsEvent = {
  id: string;
  name: string | null;
  status: string | null;
  divisions: LiveHeatsDivision[];
};

/** Extract the numeric LiveHeats event id from a stored liveheats_url. */
export function parseLiveheatsEventId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/events\/(\d+)/);
  return m ? m[1] : null;
}

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(LIVEHEATS_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      // Caching is handled at the unstable_cache layer, not the data cache.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    // GraphQL may return partial data alongside errors; use whatever data we got.
    return (json?.data ?? null) as T | null;
  } catch {
    return null;
  }
}

// Proven shape (matches scripts/scrape-event-results.js, which is known to work).
const RESULTS_QUERY = `
  query EventResults($id: ID!) {
    event(id: $id) {
      id
      name
      status
      eventDivisions {
        id
        division { name }
        leaderboards {
          result {
            place
            total
            athleteId
            competitor { athlete { id name } }
          }
        }
      }
    }
  }
`;

// Entries fetched separately so an unexpected schema here can never break results.
const ENTRIES_QUERY = `
  query EventEntries($id: ID!) {
    event(id: $id) {
      eventDivisions {
        id
        division { name }
        entries {
          athlete { id name }
        }
      }
    }
  }
`;

type RawResult = {
  place: number | null;
  total: number | null;
  athleteId: string | number | null;
  competitor: { athlete: { id: string; name: string } | null } | null;
};

type ResultsData = {
  event: {
    id: string;
    name: string | null;
    status: string | null;
    eventDivisions: Array<{
      id: string;
      division: { name: string | null } | null;
      leaderboards: Array<{ result: RawResult[] | null }> | null;
    }> | null;
  } | null;
};

type EntriesData = {
  event: {
    eventDivisions: Array<{
      id: string;
      division: { name: string | null } | null;
      entries: Array<{ athlete: { id: string; name: string } | null }> | null;
    }> | null;
  } | null;
};

async function fetchLiveHeatsEvent(eventId: string): Promise<LiveHeatsEvent | null> {
  const [resultsData, entriesData] = await Promise.all([
    graphql<ResultsData>(RESULTS_QUERY, { id: eventId }),
    graphql<EntriesData>(ENTRIES_QUERY, { id: eventId }),
  ]);

  const ev = resultsData?.event ?? null;
  if (!ev && !entriesData?.event) return null;

  const divisions = new Map<string, LiveHeatsDivision>();
  const ensureDivision = (id: string, name: string | null): LiveHeatsDivision => {
    let d = divisions.get(id);
    if (!d) {
      d = { id, name: name || "Division", entries: [], results: [] };
      divisions.set(id, d);
    } else if ((!d.name || d.name === "Division") && name) {
      d.name = name;
    }
    return d;
  };

  // Results: pick the single leaderboard with the most entries (the overall
  // standings), rather than concatenating every round's leaderboard.
  for (const ed of ev?.eventDivisions ?? []) {
    const d = ensureDivision(ed.id, ed.division?.name ?? null);
    let best: RawResult[] = [];
    for (const lb of ed.leaderboards ?? []) {
      const rs = lb?.result ?? [];
      if (rs.length > best.length) best = rs;
    }
    for (const r of best) {
      if (r.place == null) continue;
      const athleteId =
        r.athleteId != null ? String(r.athleteId) : r.competitor?.athlete?.id ?? null;
      d.results.push({
        place: r.place,
        total: r.total ?? null,
        athleteId,
        name: r.competitor?.athlete?.name ?? "Unknown",
      });
    }
    d.results.sort((a, b) => a.place - b.place);
  }

  // Entries.
  for (const ed of entriesData?.event?.eventDivisions ?? []) {
    const d = ensureDivision(ed.id, ed.division?.name ?? null);
    for (const en of ed.entries ?? []) {
      if (!en.athlete) continue;
      d.entries.push({ athleteId: en.athlete.id ?? null, name: en.athlete.name });
    }
    d.entries.sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    id: ev?.id ?? eventId,
    name: ev?.name ?? null,
    status: ev?.status ?? null,
    divisions: [...divisions.values()].filter((d) => d.entries.length > 0 || d.results.length > 0),
  };
}

type EventCategory = { division?: string | null; discipline?: string | null; gender?: string | null };

function divisionMatchesCategory(divName: string, cat: EventCategory): boolean {
  const n = divName.toLowerCase();
  if (cat.division && !n.includes(cat.division.toLowerCase())) return false;
  if (cat.discipline && !n.includes(cat.discipline.toLowerCase())) return false;
  if (cat.gender) {
    const isWomen = /women|female|femenino|girls/.test(n);
    const isMen = !isWomen && (/\bmen\b/.test(n) || /masculino|boys|\bmale\b/.test(n));
    if (cat.gender.toLowerCase() === "women" && !isWomen) return false;
    if (cat.gender.toLowerCase() === "men" && !isMen) return false;
  }
  return true;
}

/**
 * All competitor divisions of an event (every age / discipline / gender), in
 * the order LiveHeats returns them, excluding non-competitor divisions
 * (coach / judge / director) and friendly heats. The division matching the
 * current IFSA event's own category is flagged via `isEventDivision` so the
 * page can highlight it.
 */
export function competitorDivisions(divisions: LiveHeatsDivision[], cat: EventCategory): LiveHeatsDivision[] {
  const excluded = /friendly|coach|judge|technical director|director t[eé]cnico/i;
  return divisions
    .filter((d) => !excluded.test(d.name))
    .map((d) => ({ ...d, isEventDivision: divisionMatchesCategory(d.name, cat) }));
}

const SEARCH_QUERY = `
  query EventsByName($search: String!) {
    eventsByName(search: $search, limit: 8) { id name }
  }
`;

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function nameScore(a: string, b: string): number {
  const at = new Set(normalizeName(a).split(" ").filter(Boolean));
  const bt = new Set(normalizeName(b).split(" ").filter(Boolean));
  if (!at.size || !bt.size) return 0;
  let inter = 0;
  for (const t of at) if (bt.has(t)) inter++;
  return inter / Math.max(at.size, bt.size);
}

/**
 * Find the LiveHeats event id for an IFSA event by name. Returns null unless a
 * confident match is found (exact normalized name, or >= 0.6 token overlap) so
 * we never link the wrong event.
 */
export async function matchLiveHeatsEventId(name: string): Promise<string | null> {
  // Clean the search term: LiveHeats' search returns nothing for smart quotes /
  // en-dashes, so normalize apostrophes to spaces and strip stars/quotes.
  const search = name
    .replace(/^\d{4}\s+/, "")
    .replace(/[‘’']/g, " ")
    .replace(/[“”"*]/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const data = await graphql<{ eventsByName: Array<{ id: string; name: string }> | null }>(
    SEARCH_QUERY,
    { search }
  );
  const candidates = data?.eventsByName ?? [];
  if (!candidates.length) return null;
  const exact = candidates.find((c) => normalizeName(c.name) === normalizeName(name));
  if (exact) return String(exact.id);
  let best: { id: string; name: string } | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const s = nameScore(name, c.name);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best && bestScore >= 0.6 ? String(best.id) : null;
}

/** Cached name->id match, for resolving an unlinked event at render time. */
export function getMatchedLiveHeatsEventId(name: string): Promise<string | null> {
  return unstable_cache(
    () => matchLiveHeatsEventId(name),
    ["liveheats-match", name],
    { revalidate: 3600 }
  )();
}

/** Cached fetch of an event's LiveHeats entries + results (revalidates every 60s). */
export function getLiveHeatsEvent(eventId: string): Promise<LiveHeatsEvent | null> {
  return unstable_cache(
    () => fetchLiveHeatsEvent(eventId),
    ["liveheats-event", eventId],
    { revalidate: 30, tags: [`liveheats-event-${eventId}`] }
  )();
}
