#!/usr/bin/env node
/**
 * Pull IFSA junior season rankings from LiveHeats into Supabase.
 *
 * Two things this fixes vs the original version:
 *
 * 1. SERIES DISCOVERY. The old script hardcoded SERIES_ID = 53121, which is the
 *    *2025-2026* series. LiveHeats mints a new series each season (2027 is 70778)
 *    but REUSES the division ids, so the scrape kept succeeding while silently
 *    serving last season's standings as current. We now look the series up by name
 *    every run. Override with RANKINGS_SERIES_ID if IFSA renames things.
 *
 * 2. HISTORY. The old script DELETEd every row then reinserted, so the table only
 *    ever held one day and no movement/trend was possible. We now write one dated
 *    snapshot per day and keep them, so place_change works from the first day this
 *    runs. Re-running the same day is idempotent (unique index on
 *    snapshot_date, series_id, athlete_id, division).
 *
 * Note: IFSA does not rank U12 in any series -- U12 competes but has no season
 * standings. That is upstream, not a gap here.
 */

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SERIES_OVERRIDE = process.env.RANKINGS_SERIES_ID || null;
const ORG_SHORT_NAME = process.env.IFSA_ORG_SHORT_NAME || 'IFSA';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const TABLE = '/rest/v1/rankings_snapshots';
const sbHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: 'Bearer ' + SUPABASE_SERVICE_KEY,
  'Content-Type': 'application/json',
};

async function gql(query) {
  const res = await fetch('https://liveheats.com/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('LiveHeats HTTP ' + res.status);
  const json = await res.json();
  if (json.errors) throw new Error('LiveHeats GraphQL: ' + JSON.stringify(json.errors));
  return json.data;
}

/** Leading 4-digit year in a series name, e.g. "2027 Junior Ranking" -> 2027. */
function seasonYear(name) {
  const m = String(name).match(/(\d{4})/g);
  if (!m) return 0;
  return Math.max.apply(null, m.map(Number));
}

async function findCurrentSeries() {
  if (SERIES_OVERRIDE) {
    const d = await gql('query { series(id: ' + SERIES_OVERRIDE + ') { id name } }');
    if (!d.series) throw new Error('RANKINGS_SERIES_ID ' + SERIES_OVERRIDE + ' not found');
    return d.series;
  }

  const data = await gql(
    'query { organisationByShortName(shortName: "' + ORG_SHORT_NAME + '") { id name series { id name } } }'
  );
  const org = data.organisationByShortName;
  if (!org) throw new Error('Organisation "' + ORG_SHORT_NAME + '" not found');

  // The junior season ranking, not dues / membership / portal / regional variants.
  const candidates = org.series.filter(function (s) {
    const n = s.name.toLowerCase();
    return n.includes('junior') && n.includes('ranking')
      && !n.includes('dues') && !n.includes('membership')
      && !n.includes('portal') && !n.includes('sudamerica');
  });

  if (!candidates.length) {
    throw new Error('No junior ranking series found. Series seen: ' +
      org.series.map(function (s) { return s.id + ':' + s.name; }).join(' | '));
  }

  candidates.sort(function (a, b) {
    const dy = seasonYear(b.name) - seasonYear(a.name);
    return dy !== 0 ? dy : Number(b.id) - Number(a.id);
  });
  return candidates[0];
}

function parseDivision(name) {
  const n = name.toLowerCase();
  return {
    discipline: n.includes('snowboard') ? 'snowboard' : 'ski',
    gender: (n.includes('women') || n.includes('girls')) ? 'women' : 'men',
  };
}

async function sb(path, method, body, extraHeaders) {
  const res = await fetch(SUPABASE_URL + path, {
    method: method,
    headers: Object.assign({}, sbHeaders, extraHeaders || {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(method + ' ' + path + ' -> HTTP ' + res.status + ' ' + text.slice(0, 400));
  return text;
}

async function main() {
  const series = await findCurrentSeries();
  console.log('Current series: ' + series.id + ' "' + series.name + '"');

  const divData = await gql('query { series(id: ' + series.id + ') { divisions { id name } } }');
  const divisions = (divData.series && divData.series.divisions) || [];
  if (!divisions.length) throw new Error('Series ' + series.id + ' has no divisions');
  console.log('Divisions: ' + divisions.map(function (d) { return d.name; }).join(', '));

  const snapshotDate = new Date().toISOString().slice(0, 10);
  const rows = [];

  for (const div of divisions) {
    process.stdout.write('  ' + div.name + ' ... ');
    try {
      const d = await gql(
        'query { series(id: ' + series.id + ') { rankings(divisionId: ' + div.id + ') { place points athlete { id name } } } }'
      );
      const rankings = (d.series && d.series.rankings) || [];
      const meta = parseDivision(div.name);

      for (const r of rankings) {
        if (!r.athlete || !r.athlete.id) continue;
        rows.push({
          athlete_id: String(r.athlete.id),
          athlete_name: r.athlete.name,
          division: div.name,
          discipline: meta.discipline,
          gender: meta.gender,
          place: r.place,
          points: r.points || null,
          series_id: String(series.id),
          series_name: series.name,
          snapshot_date: snapshotDate,
          is_current: true,
          updated_at: new Date().toISOString(),
        });
      }
      console.log(rankings.length + ' athletes');
    } catch (err) {
      console.log('ERROR ' + err.message);
      throw err; // a partial ranking snapshot is worse than none
    }
    await new Promise(function (r) { setTimeout(r, 300); });
  }

  if (rows.length < 50) {
    throw new Error('Only ' + rows.length + ' ranking rows returned; refusing to write a suspect snapshot');
  }

  console.log('\nWriting ' + rows.length + ' rows for ' + snapshotDate + ' ...');

  // Any other series is no longer current (e.g. last season's rows).
  await sb(TABLE + '?series_id=neq.' + encodeURIComponent(series.id), 'PATCH', { is_current: false });

  const onConflict = 'snapshot_date,series_id,athlete_id,division';
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    await sb(TABLE + '?on_conflict=' + onConflict, 'POST', batch, {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    });
    process.stdout.write('  saved ' + Math.min(i + 200, rows.length) + '/' + rows.length + '\r');
  }

  console.log('\nDone. Season: ' + series.name);
}

main().catch(function (err) {
  console.error('\nscrape-rankings failed: ' + err.message);
  process.exit(1);
});
