import * as cheerio from "cheerio";

async function fetchEventDetails(ifsaUrl: string): Promise<{
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  location_text: string | null;
}> {
  const res = await fetch(ifsaUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });

  if (!res.ok) return { start_date: null, end_date: null, venue_name: null, location_text: null };

  const html = await res.text();
  const $ = cheerio.load(html);

  let startIso =
    $('meta[property="event:start_date"]').attr("content") ||
    $('meta[itemprop="startDate"]').attr("content") ||
    null;

  let endIso =
    $('meta[property="event:end_date"]').attr("content") ||
    $('meta[itemprop="endDate"]').attr("content") ||
    null;

  if (!startIso) {
    const months: Record<string, string> = {
      January: "01", February: "02", March: "03", April: "04",
      May: "05", June: "06", July: "07", August: "08",
      September: "09", October: "10", November: "11", December: "12"
    };
    const dateRegex = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/g;
    const matches = [...html.matchAll(dateRegex)];
    if (matches.length > 0) {
      const m = matches[0];
      startIso = `${m[3]}-${months[m[1]]}-${m[2].padStart(2, "0")}`;
    }
    if (matches.length > 1) {
      const m = matches[1];
      endIso = `${m[3]}-${months[m[1]]}-${m[2].padStart(2, "0")}`;
    }
  }

  const toYmd = (iso: string | null) => (iso ? iso.slice(0, 10) : null);

  const venue =
    $(".tribe-venue-name").first().text().trim() ||
    $('[itemprop="location"]').first().text().trim() ||
    $(".tribe-venue").first().text().trim() ||
    "";

  const locality = $(".tribe-locality").first().text().trim() || $('[itemprop="addressLocality"]').first().text().trim() || "";
  const region = $(".tribe-region").first().text().trim() || $('[itemprop="addressRegion"]').first().text().trim() || "";
  const country = $(".tribe-country-name").first().text().trim() || $('[itemprop="addressCountry"]').first().text().trim() || "";
  const parts = [locality, region, country].filter(Boolean);

  return {
    start_date: toYmd(startIso),
    end_date: toYmd(endIso),
    venue_name: venue || null,
    location_text: parts.join(", ") || null,
  };
}

// Category pages (North America focused, gender-split)
const CATEGORY_SOURCES = [
  { division: "U19", discipline: "ski",       gender: "men",   url: "https://ifsafreeride.org/events/category/u19-ski-men/" },
  { division: "U19", discipline: "ski",       gender: "women", url: "https://ifsafreeride.org/events/category/u19-ski-women/" },
  { division: "U19", discipline: "snowboard", gender: "men",   url: "https://ifsafreeride.org/events/category/u19-snowboard-men/" },
  { division: "U19", discipline: "snowboard", gender: "women", url: "https://ifsafreeride.org/events/category/u19-snowboard-women/" },
  { division: "U15", discipline: "ski",       gender: "men",   url: "https://ifsafreeride.org/events/category/u15-ski-men/" },
  { division: "U15", discipline: "ski",       gender: "women", url: "https://ifsafreeride.org/events/category/u15-ski-women/" },
  { division: "U15", discipline: "snowboard", gender: "men",   url: "https://ifsafreeride.org/events/category/u15-snowboard-men/" },
  { division: "U15", discipline: "snowboard", gender: "women", url: "https://ifsafreeride.org/events/category/u15-snowboard-women/" },
  { division: "U12", discipline: "ski",       gender: "men",   url: "https://ifsafreeride.org/events/category/u12-ski-boys/" },
  { division: "U12", discipline: "ski",       gender: "women", url: "https://ifsafreeride.org/events/category/u12-ski-girls/" },
  { division: "U12", discipline: "snowboard", gender: "men",   url: "https://ifsafreeride.org/events/category/u12-snowboard-boys/" },
  { division: "U12", discipline: "snowboard", gender: "women", url: "https://ifsafreeride.org/events/category/u12-snowboard-girls/" },
];

// Competition pages (full Americas including South America, gender-combined)
const COMPETITION_SOURCES = [
  { division: "U19", discipline: "ski",       url: "https://ifsafreeride.org/competition/junior-ski-u19/" },
  { division: "U19", discipline: "snowboard", url: "https://ifsafreeride.org/competition/junior-snowboard-u19/" },
  { division: "U15", discipline: "ski",       url: "https://ifsafreeride.org/competition/junior-ski-u15/" },
  { division: "U15", discipline: "snowboard", url: "https://ifsafreeride.org/competition/junior-snowboard-u15/" },
  { division: "U12", discipline: "ski",       url: "https://ifsafreeride.org/competition/junior-ski-12/" },
  { division: "U12", discipline: "snowboard", url: "https://ifsafreeride.org/competition/junior-snowboard-u12/" },
];

function parseStarsFromText(text: string): number | null {
  const m1 = text.match(/\b([1-4])\s*\*/);
  if (m1) return Number(m1[1]);
  const m2 = text.match(/\u2605+/);
  return m2 ? m2[0].length : null;
}

function inferGender(text: string): "men" | "women" {
  const t = text.toLowerCase();
  if (t.includes("women") || t.includes("girl") || t.includes("femenino") || t.includes("female")) return "women";
  return "men";
}

async function scrapePage(url: string, division: string, discipline: string, defaultGender?: "men" | "women", defaultStatus?: string): Promise<any[]> {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const candidates: any[] = [];

  $('h4 a[href*="/event/"]').each((_, a) => {
    const link = $(a);
    const href = link.attr("href") || "";
    if (!href.includes("/event/")) return;
    const name = link.text().replace(/\s+/g, " ").trim();
    if (!name) return;

    const wrapper = link.closest(".tribe-events-calendar-list__event, article, li, div");
    const cardText = wrapper.text().replace(/\s+/g, " ").trim();

    const stars = parseStarsFromText(name) ?? parseStarsFromText(cardText);
    if (division !== "U12" && stars !== 2 && stars !== 3) return;

    const statusMatch = cardText.match(/\b(upcoming|drawn|completed|cancelled|scheduled|results_published)\b/i);
    const gender = defaultGender ?? inferGender(name + " " + cardText);

    candidates.push({
      name,
      href,
      stars,
      status: statusMatch?.[0]?.toLowerCase() ?? defaultStatus ?? "upcoming",
      division,
      discipline,
      gender,
    });
  });

  return candidates;
}

export async function fetchIfsaU19_2star_3star(): Promise<any[]> {
  const map = new Map<string, any>();

  // Scrape category pages (upcoming + past)
  for (const src of CATEGORY_SOURCES) {
    const upcoming = await scrapePage(src.url, src.division, src.discipline, src.gender, "upcoming");
    const past = await scrapePage(src.url + "?eventDisplay=past", src.division, src.discipline, src.gender, "completed");
    for (const c of [...upcoming, ...past]) {
      if (!map.has(c.href + "|" + c.division)) map.set(c.href + "|" + c.division, c);
    }
  }

  // Scrape competition pages (full Americas) — fills in anything missing
  for (const src of COMPETITION_SOURCES) {
    const events = await scrapePage(src.url, src.division, src.discipline, undefined, "upcoming");
    for (const c of events) {
      if (!map.has(c.href + "|" + c.division)) map.set(c.href + "|" + c.division, c);
    }
  }

  // Fetch details for every unique event
  const out: any[] = [];
  for (const c of map.values()) {
    const details = await fetchEventDetails(c.href);
    out.push({
      name: c.name,
      ifsa_url: c.href,
      stars: c.stars,
      discipline: c.discipline,
      gender: c.gender,
      division: c.division,
      status: c.status ?? "upcoming",
      start_date: details.start_date ?? null,
      end_date: details.end_date ?? null,
      venue_name: details.venue_name ?? null,
      location_text: details.location_text ?? null,
    });
  }

  return out;
}
