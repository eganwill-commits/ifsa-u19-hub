#!/usr/bin/env node
/**
 * Scrape the IFSA event calendar into Supabase.
 *
 * Replaces the POST /api/sync-events Vercel route, which could not finish. The
 * route re-fetched a detail page for EVERY event on EVERY run, sequentially --
 * roughly 30 list pages plus one request per unique event. Fine with 140 known
 * events and a warm cache; impossible when a new season adds ~200 more. It blew
 * the 60s Vercel ceiling, returned 5xx, and the workflow swallowed it, so
 * ifsa_events sat frozen from 2026-09-18 while the site showed 0 upcoming events.
 *
 * Three changes make it finish:
 *   1. Runs in the GitHub Action, not a serverless function. No timeout.
 *   2. Incremental -- detail pages are only fetched for events we do not already
 *      have dated, plus anything still upcoming (whose dates can still move).
 *      Past, already-dated events are skipped entirely.
 *   3. Bounded concurrency instead of a sequential loop.
 */

require('dotenv').config({ path: '.env.local' });
const cheerio = require('cheerio');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const CONCURRENCY = 6;        // polite against ifsafreeride.org
const GEOCODE_BUDGET = 40;    // rest fill in on later runs
const REFRESH_WINDOW_DAYS = 7; // also re-check events that just happened
// Bump when fetchEventDetails learns new fields: every row below this version gets
// its detail page re-read once (a one-time backfill), then goes back to incremental.
const DETAILS_VERSION = 2;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15';
const HEADERS = {
  'user-agent': UA,
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
};

const CATEGORY_SOURCES = [
  { division: 'U19', discipline: 'ski',       gender: 'men',   url: 'https://ifsafreeride.org/events/category/u19-ski-men/' },
  { division: 'U19', discipline: 'ski',       gender: 'women', url: 'https://ifsafreeride.org/events/category/u19-ski-women/' },
  { division: 'U19', discipline: 'snowboard', gender: 'men',   url: 'https://ifsafreeride.org/events/category/u19-snowboard-men/' },
  { division: 'U19', discipline: 'snowboard', gender: 'women', url: 'https://ifsafreeride.org/events/category/u19-snowboard-women/' },
  { division: 'U15', discipline: 'ski',       gender: 'men',   url: 'https://ifsafreeride.org/events/category/u15-ski-men/' },
  { division: 'U15', discipline: 'ski',       gender: 'women', url: 'https://ifsafreeride.org/events/category/u15-ski-women/' },
  { division: 'U15', discipline: 'snowboard', gender: 'men',   url: 'https://ifsafreeride.org/events/category/u15-snowboard-men/' },
  { division: 'U15', discipline: 'snowboard', gender: 'women', url: 'https://ifsafreeride.org/events/category/u15-snowboard-women/' },
  { division: 'U12', discipline: 'ski',       gender: 'men',   url: 'https://ifsafreeride.org/events/category/u12-ski-boys/' },
  { division: 'U12', discipline: 'ski',       gender: 'women', url: 'https://ifsafreeride.org/events/category/u12-ski-girls/' },
  { division: 'U12', discipline: 'snowboard', gender: 'men',   url: 'https://ifsafreeride.org/events/category/u12-snowboard-boys/' },
  { division: 'U12', discipline: 'snowboard', gender: 'women', url: 'https://ifsafreeride.org/events/category/u12-snowboard-girls/' },
];

const COMPETITION_SOURCES = [
  { division: 'U19', discipline: 'ski',       url: 'https://ifsafreeride.org/competition/junior-ski-u19/' },
  { division: 'U19', discipline: 'snowboard', url: 'https://ifsafreeride.org/competition/junior-snowboard-u19/' },
  { division: 'U15', discipline: 'ski',       url: 'https://ifsafreeride.org/competition/junior-ski-u15/' },
  { division: 'U15', discipline: 'snowboard', url: 'https://ifsafreeride.org/competition/junior-snowboard-u15/' },
  { division: 'U12', discipline: 'ski',       url: 'https://ifsafreeride.org/competition/junior-ski-12/' },
  { division: 'U12', discipline: 'snowboard', url: 'https://ifsafreeride.org/competition/junior-snowboard-u12/' },
];

const MONTHS = { January:'01', February:'02', March:'03', April:'04', May:'05', June:'06',
                 July:'07', August:'08', September:'09', October:'10', November:'11', December:'12' };

function parseStars(text) {
  const m1 = text.match(/\b([1-4])\s*\*/);
  if (m1) return Number(m1[1]);
  const m2 = text.match(/★+/);
  return m2 ? m2[0].length : null;
}

function inferGender(text) {
  const t = text.toLowerCase();
  return (t.includes('women') || t.includes('girl') || t.includes('femenino') || t.includes('female')) ? 'women' : 'men';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The previous version returned null on any non-200 and callers turned that into
 * an empty list. That is how the U12 categories -- which are fetched last, after
 * ~16 other requests -- silently contributed nothing: ifsafreeride.org throttles
 * and a 429 looked exactly like "no events". Retry with backoff, then be loud.
 */
async function getHtml(url, { tries = 3, required = true } = {}) {
  let lastStatus = null;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
      if (res.ok) return res.text();
      lastStatus = res.status;
      if (res.status === 404) return null; // genuinely absent, e.g. past the last page
    } catch (err) {
      lastStatus = err.message;
    }
    if (attempt < tries) await sleep(attempt * 1500);
  }
  if (required) throw new Error('Failed to fetch ' + url + ' after ' + tries + ' tries (last: ' + lastStatus + ')');
  console.warn('  WARN could not fetch ' + url + ' (last: ' + lastStatus + ')');
  return null;
}

async function scrapeList(url, division, discipline, defaultGender, defaultStatus, opts) {
  const html = await getHtml(url, opts);
  if (!html) return [];
  const $ = cheerio.load(html);
  const out = [];

  $('h4 a[href*="/event/"]').each((_, a) => {
    const link = $(a);
    const href = link.attr('href') || '';
    if (!href.includes('/event/')) return;
    const name = link.text().replace(/\s+/g, ' ').trim();
    if (!name) return;

    const wrapper = link.closest('.tribe-events-calendar-list__event, article, li, div');
    const cardText = wrapper.text().replace(/\s+/g, ' ').trim();

    const stars = parseStars(name) ?? parseStars(cardText);
    // U15/U19 junior events are 2* and 3*. Anything else on these pages is not a
    // junior series stop. U12 carries no star rating at all.
    if (division !== 'U12' && stars !== 2 && stars !== 3) return;

    const statusMatch = cardText.match(/\b(upcoming|drawn|completed|cancelled|scheduled|results_published)\b/i);

    out.push({
      name,
      href,
      stars,
      status: (statusMatch && statusMatch[0].toLowerCase()) || defaultStatus || 'upcoming',
      division,
      discipline,
      gender: defaultGender || inferGender(name + ' ' + cardText),
    });
  });

  return out;
}

const MAX_PAGES = 12;

/**
 * Category pages are paginated at 50 events. Reading only page 1 is why the first
 * run stopped at late February -- March and April were on page 2.
 */
async function scrapeListPaged(baseUrl, division, discipline, defaultGender, defaultStatus, pastView, isNew) {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1
      ? baseUrl + (pastView ? '?eventDisplay=past' : '')
      : baseUrl + 'page/' + page + '/' + (pastView ? '?eventDisplay=past' : '');

    // Page 1 must work. Later pages may legitimately not exist.
    const rows = await scrapeList(url, division, discipline, defaultGender, defaultStatus, {
      required: page === 1 && !pastView,
    });
    if (!rows.length) break;
    all.push(...rows);

    // Stop paging a source that is only repeating what we already have. The
    // competition pages mirror the category pages, so without this each one walks
    // 12 pages to contribute nothing -- ~70 pointless requests against IFSA.
    // Always read at least two pages before concluding that.
    if (page >= 2 && isNew && !rows.some(isNew)) break;

    await sleep(400); // be a good citizen; this is what tripped the throttle before
  }
  return all;
}

async function fetchEventDetails(url) {
  const empty = { start_date: null, end_date: null, venue_name: null, location_text: null };
  let html;
  try { html = await getHtml(url); } catch { return empty; }
  if (!html) return empty;

  const $ = cheerio.load(html);
  let startIso = $('meta[property="event:start_date"]').attr('content') || $('meta[itemprop="startDate"]').attr('content') || null;
  let endIso   = $('meta[property="event:end_date"]').attr('content')   || $('meta[itemprop="endDate"]').attr('content')   || null;

  if (!startIso) {
    const re = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/g;
    const matches = [...html.matchAll(re)];
    if (matches[0]) startIso = `${matches[0][3]}-${MONTHS[matches[0][1]]}-${String(matches[0][2]).padStart(2,'0')}`;
    if (matches[1]) endIso   = `${matches[1][3]}-${MONTHS[matches[1][1]]}-${String(matches[1][2]).padStart(2,'0')}`;
  }

  const ymd = (iso) => (iso ? iso.slice(0, 10) : null);
  const venue = $('.tribe-venue-name').first().text().trim() || $('[itemprop="location"]').first().text().trim() || $('.tribe-venue').first().text().trim() || '';
  const locality = $('.tribe-locality').first().text().trim() || $('[itemprop="addressLocality"]').first().text().trim() || '';
  const region   = $('.tribe-region').first().text().trim()   || $('[itemprop="addressRegion"]').first().text().trim()   || '';
  const country  = $('.tribe-country-name').first().text().trim() || $('[itemprop="addressCountry"]').first().text().trim() || '';

  // --- Links + registration (details_version 2) ---------------------------
  // IFSA renders these as plain label/value text, not microdata, so read the
  // flattened page text. Verified against the 2027 event template (Nov 2026).
  const text = $('body').text().replace(/\s+/g, ' ');
  const grab = (re) => { const m = text.match(re); return m ? m[1].trim() : null; };
  const TS = '(\\d{4}-\\d{2}-\\d{2} \\d{1,2}:\\d{2} ?[AP]M(?: [A-Z]{2,5})?)';
  const registration_opens = parseIfsaTime(grab(new RegExp('Registration Start Time\\s*' + TS, 'i')));
  const registration_closes = parseIfsaTime(grab(new RegExp('Registration Close Time\\s*' + TS, 'i')));

  // The event's own contact sits in the details row; the footer also has
  // support@ifsafreeride.org, which we do not want.
  let contact_email = null;
  $('a[href^="mailto:"]').each((_, a) => {
    if (contact_email) return;
    const addr = ($(a).attr('href') || '').replace(/^mailto:/i, '').split('?')[0].trim();
    if (!/@/.test(addr) || /support@ifsafreeride\.org/i.test(addr)) return;
    if ($(a).closest('.textwidget, footer, .synved-social-button').length) return;
    contact_email = addr;
  });

  let venue_website = null;
  $('a').each((_, a) => {
    if (!venue_website && /View Venue Website/i.test($(a).text())) venue_website = $(a).attr('href') || null;
  });

  // "Supporting Information" / Event Guide is a Google Doc link on the page.
  let event_guide_url = null;
  $('a[href*="docs.google.com"], a[href*="drive.google.com"]').each((_, a) => {
    if (!event_guide_url) event_guide_url = $(a).attr('href') || null;
  });

  // Markup: <h4>Region</h4> Far West <dd class="tribe-venue-url">… — the value is
  // a bare text node right after the heading.
  let ifsa_region = null;
  $('h4').each((_, h) => {
    if (ifsa_region || $(h).text().trim() !== 'Region') return;
    const nxt = h.nextSibling;
    const v = nxt && nxt.type === 'text' ? $(nxt).text().trim() : '';
    if (v && v.length <= 40) ifsa_region = v;
  });
  const street_address = $('.tribe-street-address').first().text().trim() || null;

  return {
    start_date: ymd(startIso),
    end_date: ymd(endIso),
    venue_name: venue || null,
    location_text: [locality, region, country].filter(Boolean).join(', ') || null,
    registration_opens, registration_closes, contact_email, venue_website,
    event_guide_url, ifsa_region, street_address,
    details_version: DETAILS_VERSION,
  };
}

/**
 * IFSA prints registration times like "2026-12-08 07:00 PM MST". Convert to an
 * ISO timestamp. Unknown zone abbreviations fall back to MST, the site's default.
 */
const TZ_OFFSETS = { UTC: '+00:00', GMT: '+00:00', EST: '-05:00', EDT: '-04:00', CST: '-06:00', CDT: '-05:00',
  MST: '-07:00', MDT: '-06:00', PST: '-08:00', PDT: '-07:00', AKST: '-09:00', AKDT: '-08:00',
  CLT: '-04:00', CLST: '-03:00', ART: '-03:00' };
function parseIfsaTime(s) {
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{1,2}):(\d{2}) ?([AP]M)(?: ([A-Z]{2,5}))?$/i);
  if (!m) return null;
  let h = Number(m[2]) % 12;
  if (m[4].toUpperCase() === 'PM') h += 12;
  const off = TZ_OFFSETS[(m[5] || 'MST').toUpperCase()] || TZ_OFFSETS.MST;
  const iso = `${m[1]}T${String(h).padStart(2, '0')}:${m[3]}:00${off}`;
  return Number.isNaN(Date.parse(iso)) ? null : new Date(iso).toISOString();
}


/**
 * IFSA's own event pages carry date typos -- the 2027 Winter Park page reads
 * "March 7, 2100 - March 7, 2100". Stored as-is, those events sit in "upcoming"
 * forever and wreck any date sort.
 *
 * When a parsed year is implausible, fall back to the season year in the event
 * name. IFSA names a season by the year it ENDS in, so a "2027 ..." event in
 * Jan-Jun is 2027 and one in Jul-Dec (the South American swing) is 2026.
 * If it still cannot be made sensible, store null rather than a wrong date.
 */
function sanitizeDate(ymd, eventName) {
  if (!ymd) return null;
  const thisYear = new Date().getFullYear();
  const year = Number(ymd.slice(0, 4));
  if (!Number.isFinite(year)) return null;
  if (year >= thisYear - 5 && year <= thisYear + 2) return ymd;

  const m = /(20\d{2})/.exec(eventName || '');
  if (!m) {
    console.warn('  WARN implausible date ' + ymd + ' on "' + eventName + '" and no year in name; storing null');
    return null;
  }
  const seasonYear = Number(m[1]);
  const month = Number(ymd.slice(5, 7));
  const corrected = month >= 7 ? seasonYear - 1 : seasonYear;
  if (corrected < thisYear - 5 || corrected > thisYear + 2) {
    console.warn('  WARN cannot repair date ' + ymd + ' on "' + eventName + '"; storing null');
    return null;
  }
  const fixed = String(corrected) + ymd.slice(4);
  console.warn('  FIXED upstream date typo on "' + eventName + '": ' + ymd + ' -> ' + fixed);
  return fixed;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function sb(path, method, body, extraHeaders) {
  const res = await fetch(SUPABASE_URL + path, {
    method,
    headers: Object.assign({
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: 'Bearer ' + SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
    }, extraHeaders || {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(method + ' ' + path + ' -> HTTP ' + res.status + ' ' + text.slice(0, 400));
  return text ? JSON.parse(text) : null;
}

async function geocode(locationText) {
  try {
    const url = 'https://geocoding-api.open-meteo.com/v1/search?name=' +
      encodeURIComponent(locationText) + '&count=1&language=en&format=json';
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data.results && data.results[0];
    return hit ? { lat: hit.latitude, lon: hit.longitude } : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('Scraping IFSA calendar...');
  const map = new Map();

  for (const src of CATEGORY_SOURCES) {
    const isNew = (c) => !map.has(c.href + '|' + c.division);
    const upcoming = await scrapeListPaged(src.url, src.division, src.discipline, src.gender, 'upcoming', false, isNew);
    const past = await scrapeListPaged(src.url, src.division, src.discipline, src.gender, 'completed', true, isNew);
    let added = 0;
    for (const c of upcoming.concat(past)) {
      const key = c.href + '|' + c.division;
      if (!map.has(key)) { map.set(key, c); added++; }
    }
    console.log('  ' + src.division + ' ' + src.discipline + ' ' + src.gender +
                ': ' + (upcoming.length + past.length) + ' listed, ' + added + ' new');
  }

  for (const src of COMPETITION_SOURCES) {
    const isNew = (c) => !map.has(c.href + '|' + c.division);
    const events = await scrapeListPaged(src.url, src.division, src.discipline, undefined, 'upcoming', false, isNew);
    let added = 0;
    for (const c of events) {
      const key = c.href + '|' + c.division;
      if (!map.has(key)) { map.set(key, c); added++; }
    }
    console.log('  competition ' + src.division + ' ' + src.discipline +
                ': ' + events.length + ' listed, ' + added + ' new');
  }

  const scraped = [...map.values()];
  console.log('Found ' + scraped.length + ' event/division rows across sources');
  if (!scraped.length) throw new Error('Scraped 0 events; refusing to write (IFSA markup may have changed)');

  // What we already know, so we can skip detail pages we do not need.
  const existingRows = await sb('/rest/v1/ifsa_events?select=ifsa_url,division,start_date,end_date,venue_name,location_text,lat,lon,event_guide_url,registration_opens,registration_closes,contact_email,venue_website,ifsa_region,street_address,details_version', 'GET');
  const existing = new Map(existingRows.map((r) => [r.ifsa_url + '|' + r.division, r]));

  const cutoff = new Date(Date.now() - REFRESH_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
  const needsDetail = scraped.filter((c) => {
    const prev = existing.get(c.href + '|' + c.division);
    if (!prev || !prev.start_date) return true;          // new, or never dated
    if ((prev.details_version || 0) < DETAILS_VERSION) return true; // one-time backfill of new fields
    if (prev.start_date >= cutoff) return true;           // upcoming/recent: dates can move
    return false;                                         // settled history
  });

  console.log('Detail pages to fetch: ' + needsDetail.length + ' of ' + scraped.length +
              ' (' + (scraped.length - needsDetail.length) + ' already dated and in the past)');

  const detailByKey = new Map();
  let done = 0;
  await mapLimit(needsDetail, CONCURRENCY, async (c) => {
    const d = await fetchEventDetails(c.href);
    detailByKey.set(c.href + '|' + c.division, d);
    done++;
    if (done % 20 === 0) process.stdout.write('  fetched ' + done + '/' + needsDetail.length + '\r');
  });
  console.log('  fetched ' + done + '/' + needsDetail.length);

  // Geocode only what still has no coordinates, cached by location and capped.
  const geoCache = new Map();
  let geocodeCalls = 0;

  const payload = [];
  for (const c of scraped) {
    const key = c.href + '|' + c.division;
    const prev = existing.get(key) || {};
    const d = detailByKey.get(key) || {};

    const start_date = sanitizeDate(d.start_date ?? prev.start_date ?? null, c.name);
    const end_date = sanitizeDate(d.end_date ?? prev.end_date ?? null, c.name);
    const venue_name = d.venue_name ?? prev.venue_name ?? null;
    const location_text = d.location_text ?? prev.location_text ?? null;
    // Never clobber a known link with null if a page fetch came back thin.
    const keep = (k) => d[k] ?? prev[k] ?? null;
    const links = {
      event_guide_url: keep('event_guide_url'),
      registration_opens: keep('registration_opens'),
      registration_closes: keep('registration_closes'),
      contact_email: keep('contact_email'),
      venue_website: keep('venue_website'),
      ifsa_region: keep('ifsa_region'),
      street_address: keep('street_address'),
      // Only advance the version when the detail page was actually read.
      details_version: d.details_version ?? prev.details_version ?? 0,
    };

    let lat = prev.lat ?? null;
    let lon = prev.lon ?? null;
    if ((lat == null || lon == null) && location_text) {
      const gk = location_text.trim().toLowerCase();
      let coords = geoCache.get(gk);
      if (coords === undefined && geocodeCalls < GEOCODE_BUDGET) {
        geocodeCalls++;
        coords = await geocode(location_text);
        geoCache.set(gk, coords);
      }
      if (coords) { lat = coords.lat; lon = coords.lon; }
    }

    payload.push({
      name: c.name,
      stars: c.stars,
      discipline: c.discipline,
      gender: c.gender,
      division: c.division,
      ifsa_url: c.href,
      status: c.status || 'upcoming',
      start_date, end_date, venue_name, location_text, lat, lon,
      ...links,
      updated_at: new Date().toISOString(),
    });
  }

  console.log('Upserting ' + payload.length + ' rows (geocoded ' + geocodeCalls + ' this run)...');
  for (let i = 0; i < payload.length; i += 100) {
    const batch = payload.slice(i, i + 100);
    try {
      await sb('/rest/v1/ifsa_events?on_conflict=ifsa_url,division', 'POST', batch, {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      });
    } catch (err) {
      console.error('\nBatch starting at row ' + i + ' failed. Retrying one at a time to find it...');
      for (const row of batch) {
        try {
          await sb('/rest/v1/ifsa_events?on_conflict=ifsa_url,division', 'POST', [row], {
            Prefer: 'resolution=merge-duplicates,return=minimal',
          });
        } catch (rowErr) {
          console.error('  REJECTED: ' + row.name + ' [' + row.division + '] ' + row.ifsa_url);
          console.error('    ' + rowErr.message.slice(0, 300));
        }
      }
      continue;
    }
    process.stdout.write('  saved ' + Math.min(i + 100, payload.length) + '/' + payload.length + '\r');
  }

  const stillMissing = payload.filter((p) => p.lat == null).length;
  console.log('\nDone. ' + payload.length + ' rows; ' + stillMissing + ' still need coordinates (next run picks them up).');
}

main().catch((err) => {
  console.error('\nsync-events failed: ' + err.message);
  process.exit(1);
});
