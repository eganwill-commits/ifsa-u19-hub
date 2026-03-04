const fs = require('fs');
const code = `import * as cheerio from "cheerio";

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
    const dateRegex = /(January|February|March|April|May|June|July|August|September|October|November|December)\\s+(\\d{1,2}),?\\s+(\\d{4})/g;
    const matches = [...html.matchAll(dateRegex)];
    if (matches.length > 0) {
      const m = matches[0];
      const month = months[m[1]];
      const day = m[2].padStart(2, "0");
      const year = m[3];
      startIso = \`\${year}-\${month}-\${day}\`;
    }
    if (matches.length > 1) {
      const m = matches[1];
      const month = months[m[1]];
      const day = m[2].padStart(2, "0");
      const year = m[3];
      endIso = \`\${year}-\${month}-\${day}\`;
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

const SOURCES = [
  { discipline: "ski", gender: "men", url: "https://ifsafreeride.org/events/category/u19-ski-men/" },
  { discipline: "ski", gender: "women", url: "https://ifsafreeride.org/events/category/u19-ski-women/" },
  { discipline: "snowboard", gender: "men", url: "https://ifsafreeride.org/events/category/u19-snowboard-men/" },
  { discipline: "snowboard", gender: "women", url: "https://ifsafreeride.org/events/category/u19-snowboard-women/" },
];

function parseStarsFromNameOrText(text: string): number | null {
  const m1 = text.match(/\\b([1-4])\\s*\\*/);
  if (m1) return Number(m1[1]);
  const m2 = text.match(/\\u2605+/);
  return m2 ? m2[0].length : null;
}

async function scrapeEventList(url: string, discipline: string, gender: string, status: string): Promise<any[]> {
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
    const name = link.text().replace(/\\s+/g, " ").trim();
    if (!name) return;
    const stars = parseStarsFromNameOrText(name);
    if (stars !== 2 && stars !== 3) return;
    const wrapper = link.closest(".tribe-events-calendar-list__event, article, li, div");
    const cardText = wrapper.text().replace(/\\s+/g, " ").trim();
    const statusMatch = cardText.match(/\\b(upcoming|drawn|completed|cancelled|scheduled|results_published)\\b/i);
    candidates.push({
      name,
      href,
      stars,
      status: statusMatch?.[0]?.toLowerCase() ?? status,
      discipline,
      gender,
    });
  });

  return candidates;
}

export async function fetchIfsaU19_2star_3star(): Promise<any[]> {
  const out: any[] = [];

  for (const src of SOURCES) {
    // Fetch upcoming events
    const upcoming = await scrapeEventList(src.url, src.discipline, src.gender, "upcoming");
    // Fetch past events
    const past = await scrapeEventList(src.url + "?eventDisplay=past", src.discipline, src.gender, "completed");
    const allCandidates = [...upcoming, ...past];

    for (const c of allCandidates) {
      const details = await fetchEventDetails(c.href);
      out.push({
        name: c.name,
        ifsa_url: c.href,
        stars: c.stars,
        discipline: c.discipline,
        gender: c.gender,
        status: c.status ?? "upcoming",
        start_date: details.start_date ?? null,
        end_date: details.end_date ?? null,
        venue_name: details.venue_name ?? null,
        location_text: details.location_text ?? null,
      });
    }
  }

  const map = new Map<string, any>();
  for (const e of out) map.set(e.ifsa_url, e);
  return [...map.values()];
}
`;
fs.writeFileSync('src/lib/ifsaEvents.ts', code);
console.log('ifsaEvents.ts updated!');
