require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function graphql(query) {
  return new Promise(function (resolve, reject) {
    const body = JSON.stringify({ query: query });
    const options = {
      hostname: 'liveheats.com',
      path: '/api/graphql',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(options, function (res) {
      let data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () { try { resolve(JSON.parse(data)); } catch (e) { resolve({}); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function supabase(method, path, body) {
  return new Promise(function (resolve, reject) {
    const url = new URL(SUPABASE_URL + path);
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(options, function (res) {
      let data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () { try { resolve(data ? JSON.parse(data) : []); } catch (e) { resolve(data); } });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Derive the trustworthy fields from the LiveHeats division name (e.g. "U19 Ski Men").
function deriveDiscipline(divName) {
  const n = divName.toLowerCase();
  if (n.indexOf('snowboard') >= 0) return 'snowboard';
  if (n.indexOf('ski') >= 0) return 'ski';
  return null;
}
function deriveGender(divName) {
  const n = divName.toLowerCase();
  if (/women|female|femenino|girls/.test(n)) return 'women';
  if (/boys|masculino|\bmale\b|\bmen\b/.test(n)) return 'men';
  return null;
}
// Non-competitor / non-athlete divisions we never store as results.
function isExcludedDivision(divName) {
  return /friendly|coach|judge|technical director|director t[eé]cnico/i.test(divName);
}
// Does a LiveHeats division name match a given ifsa_events row's category?
function matchesIfsaRow(divName, row) {
  const n = divName.toLowerCase();
  if (row.division && n.indexOf(row.division.toLowerCase()) < 0) return false;
  if (row.discipline && n.indexOf(row.discipline.toLowerCase()) < 0) return false;
  const g = deriveGender(divName);
  if (row.gender && g && row.gender.toLowerCase() !== g) return false;
  return true;
}

async function main() {
  const events = await supabase(
    'GET',
    '/rest/v1/ifsa_events?select=id,name,discipline,gender,division,stars,start_date,liveheats_url&liveheats_url=not.is.null&status=eq.completed&hidden=eq.false'
  );
  console.log('Completed linked events (rows): ' + events.length);

  // Group ifsa_events rows by their LiveHeats event id (many division-rows -> one LiveHeats event).
  const byLh = new Map();
  for (const e of events) {
    const m = e.liveheats_url.match(/events\/(\d+)/);
    if (!m) continue;
    const lhId = m[1];
    if (!byLh.has(lhId)) byLh.set(lhId, []);
    byLh.get(lhId).push(e);
  }
  console.log('Unique LiveHeats events: ' + byLh.size);

  const allResults = [];
  let i = 0;
  for (const [lhId, rows] of byLh) {
    i++;
    try {
      const data = await graphql(
        'query { event(id: ' + lhId + ') { name eventDivisions { division { name } leaderboards { result { place total athleteId competitor { athlete { id name } } } } } } }'
      );
      const ev = data && data.data && data.data.event;
      if (!ev) { console.log('no event data for ' + lhId); continue; }
      const eventName = ev.name;

      for (const d of ev.eventDivisions || []) {
        const divName = d.division && d.division.name ? d.division.name : '';
        if (!divName || isExcludedDivision(divName)) continue;
        const gender = deriveGender(divName);
        if (!gender) continue; // event_results.gender is constrained to men/women
        const discipline = deriveDiscipline(divName);

        // Use the leaderboard with the most results (= overall standings).
        let best = [];
        for (const lb of d.leaderboards || []) {
          const rs = lb.result || [];
          if (rs.length > best.length) best = rs;
        }
        // Match this division back to a specific ifsa_events row for the id/stars/date.
        const row = rows.find((r) => matchesIfsaRow(divName, r)) || null;
        const stars = row ? row.stars : rows[0] ? rows[0].stars : null;
        const eventDate = row ? row.start_date : rows[0] ? rows[0].start_date : null;

        for (const r of best) {
          if (r.place == null) continue;
          const athleteId = r.athleteId != null
            ? String(r.athleteId)
            : (r.competitor && r.competitor.athlete ? String(r.competitor.athlete.id) : null);
          if (!athleteId) continue;
          allResults.push({
            ifsa_event_id: row ? row.id : null,
            athlete_id: athleteId,
            athlete_name: r.competitor && r.competitor.athlete ? r.competitor.athlete.name : null,
            event_name: eventName,
            division: divName,
            discipline: discipline,
            gender: gender,
            stars: stars,
            place: r.place,
            score: r.total != null ? String(r.total) : null,
            event_date: eventDate,
            source: 'liveheats',
            updated_at: new Date().toISOString(),
          });
        }
      }
      process.stdout.write('Processed ' + i + '/' + byLh.size + ' events, ' + allResults.length + ' results\r');
      await new Promise((r) => setTimeout(r, 250));
    } catch (e) {
      console.log('\nError on LiveHeats event ' + lhId + ': ' + e.message);
    }
  }

  console.log('\nTotal results: ' + allResults.length);

  // Safety guard: never wipe the table if the scrape came back near-empty (API/network failure).
  if (allResults.length < 100) {
    console.log('Aborting: too few results (' + allResults.length + '), not overwriting existing data.');
    process.exit(1);
  }

  console.log('Clearing old event_results...');
  await supabase('DELETE', '/rest/v1/event_results?id=not.is.null');

  for (let j = 0; j < allResults.length; j += 50) {
    await supabase('POST', '/rest/v1/event_results', allResults.slice(j, j + 50));
    process.stdout.write('Saved ' + Math.min(j + 50, allResults.length) + '/' + allResults.length + '\r');
  }
  console.log('\nDone.');
}

main();
