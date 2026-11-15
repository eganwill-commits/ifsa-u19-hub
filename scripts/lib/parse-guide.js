/**
 * Parse an IFSA Event Guide (a Google Doc, fetched as /mobilebasic HTML) into
 * the facts a parent needs on one screen.
 *
 * The guides share a template (checked on 2027 Sugar Bowl, Whiteface and Kirkwood,
 * Nov 2026):
 *   - header paragraphs  "EVENT DATE(S): …", "INSPECTION DATE: …", "WEATHER DAY: …"
 *   - 2-column label/value tables  (REGISTRATION FEES | $125 USD)
 *   - 1-column "label row, value row" tables  (LIFT TICKETS / Athlete daily …)
 *   - a 4-column SCHEDULE table  DATE | TIME | ACTIVITY | LOCATION, where the
 *     date is only filled on the first row of each day.
 * Anything that doesn't fit is ignored rather than guessed.
 */
const cheerio = require('cheerio');

const LABELS = [
  [/^REGISTRATION FEES?/i, 'fees'],
  [/^REGISTRATION CAPS?/i, 'caps'],
  [/^DIVISIONS?/i, 'divisions'],
  [/^DAY OF EVENT COMMUNICATION/i, 'communication'],
  [/^LODGING/i, 'lodging'],
  [/^LIFT TICKETS?/i, 'lift_tickets'],
  [/^PASSES/i, 'passes'],
  [/^PARKING/i, 'parking'],
  [/^SPECTATOR/i, 'spectators'],
  [/^ON-?MOUNTAIN VENUE DIRECTIONS/i, 'venue_directions'],
  [/^EVENT LINKS/i, 'event_links'],
  [/^PREFERRED WEATHER/i, 'weather_sources'],
  [/^SPECIAL EVENTS/i, 'special_events'],
];

const MAX_TEXT = 700;

function keyFor(label) {
  const l = label.replace(/\s+/g, ' ').trim();
  for (const [re, key] of LABELS) if (re.test(l)) return key;
  return null;
}

/** Google Docs wraps links as https://www.google.com/url?q=REAL&sa=… */
function unwrap(href) {
  if (!href) return null;
  try {
    const u = new URL(href, 'https://docs.google.com');
    if (/google\.com$/.test(u.hostname) && u.pathname === '/url' && u.searchParams.get('q')) return u.searchParams.get('q');
    return u.href;
  } catch { return null; }
}

/** Cell → text with one line per paragraph, nbsp collapsed. */
function cellText($, el) {
  const paras = $(el).find('p').map((_, p) => $(p).text().replace(/ /g, ' ').replace(/\s+/g, ' ').trim()).get();
  const lines = (paras.length ? paras : [$(el).text().replace(/\s+/g, ' ').trim()]).filter(Boolean);
  const text = lines.join('\n');
  return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT - 1) + '…' : text;
}

function cellLinks($, el) {
  const out = [];
  $(el).find('a[href]').each((_, a) => {
    const url = unwrap($(a).attr('href'));
    if (!url || !/^https?:/i.test(url)) return;
    const label = $(a).text().replace(/\s+/g, ' ').trim() || url;
    out.push({ label: label.slice(0, 80), url });
  });
  // Bare URLs typed as text (e.g. "https://whiteface.com/mountain/trail-map/")
  const text = $(el).text();
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')]+/g)) {
    if (!out.some((l) => l.url === m[0])) out.push({ label: m[0].replace(/^https?:\/\/(www\.)?/, '').slice(0, 80), url: m[0] });
  }
  return out;
}

const isLabel = (t) => t && t.length <= 80 && t === t.toUpperCase() && /[A-Z]/.test(t);

function parseGuide(html) {
  const $ = cheerio.load(html);
  const out = { sections: {}, schedule: [] };

  // Header paragraphs
  $('p').each((_, p) => {
    const t = $(p).text().replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    let m;
    if ((m = t.match(/^EVENT DATE\(?S?\)?:\s*(.*)$/i)) && m[1]) out.event_dates = m[1].slice(0, 120);
    else if ((m = t.match(/^INSPECTION DATE:\s*(.*)$/i)) && m[1]) out.inspection = m[1].slice(0, 120);
    else if ((m = t.match(/^WEATHER DAY:\s*(.*)$/i)) && m[1]) out.weather_day = m[1].slice(0, 120);
  });

  $('table').each((_, table) => {
    const rows = $(table).find('tr').toArray();
    if (!rows.length) return;
    const firstCells = $(rows[0]).find('td,th').toArray().map((c) => $(c).text().replace(/\s+/g, ' ').trim().toUpperCase());

    // Schedule
    if (firstCells.length >= 4 && firstCells[0] === 'DATE' && firstCells[1] === 'TIME') {
      let date = '';
      for (const r of rows.slice(1)) {
        const cells = $(r).find('td').toArray();
        if (cells.length < 4) continue;
        const [d, time, activity, location] = cells.map((c) => cellText($, c));
        if (d) date = d.replace(/\s+/g, ' ');
        if (!time && !activity) continue;
        out.schedule.push({ date, time, activity, location });
        if (out.schedule.length >= 60) break;
      }
      return;
    }

    // 2-column label | value rows
    let matched = false;
    for (const r of rows) {
      const cells = $(r).find('td').toArray();
      if (cells.length !== 2) continue;
      const label = $(cells[0]).text().replace(/\s+/g, ' ').trim();
      const key = isLabel(label) && keyFor(label);
      if (!key) continue;
      matched = true;
      const text = cellText($, cells[1]);
      if (text) out.sections[key] = { text, links: cellLinks($, cells[1]) };
    }
    if (matched) return;

    // 1-column: label row then value row(s)
    if (firstCells.length === 1 && rows.length >= 2) {
      const label = $(rows[0]).text().replace(/\s+/g, ' ').trim();
      const key = isLabel(label) && keyFor(label);
      if (!key) return;
      const valueCells = rows.slice(1).map((r) => $(r).find('td').first()).filter((c) => c.length);
      const text = valueCells.map((c) => cellText($, c)).filter(Boolean).join('\n');
      const links = valueCells.flatMap((c) => cellLinks($, c));
      if (text) out.sections[key] = { text: text.slice(0, MAX_TEXT), links };
    }
  });

  return out;
}

/** True when the parse found something worth showing. */
function hasContent(g) {
  return !!(g && (g.event_dates || g.inspection || g.weather_day || g.schedule.length || Object.keys(g.sections).length));
}

/** Google Doc id from any docs.google.com/document/d/<id>/… URL. */
function docIdFromUrl(url) {
  const m = /docs\.google\.com\/document\/d\/([A-Za-z0-9_-]{20,})/.exec(url || '');
  return m ? m[1] : null;
}

module.exports = { parseGuide, hasContent, docIdFromUrl, unwrap };
