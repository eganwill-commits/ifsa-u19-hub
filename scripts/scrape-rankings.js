require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const SERIES_ID = 53121;
const DIVISIONS = [
  { id: 77447, name: 'U19 Ski Men', discipline: 'ski', gender: 'men' },
  { id: 77446, name: 'U19 Ski Women', discipline: 'ski', gender: 'women' },
  { id: 77454, name: 'U19 Snowboard Men', discipline: 'snowboard', gender: 'men' },
  { id: 77453, name: 'U19 Snowboard Women', discipline: 'snowboard', gender: 'women' },
  { id: 77445, name: 'U15 Ski Men', discipline: 'ski', gender: 'men' },
  { id: 77451, name: 'U15 Ski Women', discipline: 'ski', gender: 'women' },
  { id: 77449, name: 'U15 Snowboard Men', discipline: 'snowboard', gender: 'men' },
  { id: 77452, name: 'U15 Snowboard Women', discipline: 'snowboard', gender: 'women' },
];

function graphql(query) {
  return new Promise(function(resolve, reject) {
    const body = JSON.stringify({ query: query });
    const options = {
      hostname: 'liveheats.com',
      path: '/api/graphql',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() { resolve(JSON.parse(data)); });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function supabaseDelete(path) {
  return new Promise(function(resolve, reject) {
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() { resolve(data); });
    });
    req.on('error', reject);
    req.end();
  });
}

function supabaseInsert(rows) {
  return new Promise(function(resolve, reject) {
    const url = new URL(SUPABASE_URL + '/rest/v1/rankings_snapshots');
    const bodyStr = JSON.stringify(rows);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'Prefer': 'resolution=merge-duplicates'
      }
    };
    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() { resolve(data); });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const allRankings = [];

  for (let d = 0; d < DIVISIONS.length; d++) {
    const div = DIVISIONS[d];
    console.log('Fetching ' + div.name + '...');
    try {
      const result = await graphql('query { series(id: ' + SERIES_ID + ') { rankings(divisionId: ' + div.id + ') { place points athlete { id name } } } }');
      const rankings = result && result.data && result.data.series && result.data.series.rankings ? result.data.series.rankings : [];
      console.log('  Found ' + rankings.length + ' athletes');

      for (let i = 0; i < rankings.length; i++) {
        const r = rankings[i];
        if (!r.athlete || !r.athlete.id) continue;
        allRankings.push({
          athlete_id: String(r.athlete.id),
          athlete_name: r.athlete.name,
          division: div.name,
          place: r.place,
          points: r.points || null,
          discipline: div.discipline,
          gender: div.gender,
          event_id: null,
          event_name: null,
          event_date: null,
          stars: null,
          score: null,
          updated_at: new Date().toISOString()
        });
      }
      await new Promise(function(r) { setTimeout(r, 300); });
    } catch(e) {
      console.log('  Error: ' + e.message);
    }
  }

  console.log('\nTotal: ' + allRankings.length + ' rankings, clearing old data...');
  await supabaseDelete('/rest/v1/rankings_snapshots?id=not.is.null');

  for (let i = 0; i < allRankings.length; i += 50) {
    const batch = allRankings.slice(i, i + 50);
    await supabaseInsert(batch);
    process.stdout.write('Saved ' + Math.min(i + 50, allRankings.length) + '/' + allRankings.length + '\r');
  }

  console.log('\nDone!');
}

main();