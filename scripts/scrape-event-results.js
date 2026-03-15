require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

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

function supabaseGet(path) {
  return new Promise(function(resolve, reject) {
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(options, function(res) {
      let data = '';
      res.on('data', function(chunk) { data += chunk; });
      res.on('end', function() { resolve(data ? JSON.parse(data) : []); });
    });
    req.on('error', reject);
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
    const url = new URL(SUPABASE_URL + '/rest/v1/event_results');
    const bodyStr = JSON.stringify(rows);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
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
  const events = await supabaseGet('/rest/v1/ifsa_events?select=id,name,discipline,gender,stars,start_date,liveheats_url&liveheats_url=not.is.null&status=eq.completed');
  console.log('Found ' + events.length + ' completed events with LiveHeats URLs');

  const allResults = [];

  for (let e = 0; e < events.length; e++) {
    const event = events[e];
    try {
      const match = event.liveheats_url.match(/events\/(\d+)/);
      if (!match) continue;
      const eventId = match[1];

      const data = await graphql('query { event(id: ' + eventId + ') { name eventDivisions { division { name } leaderboards { result { place total athleteId competitor { athlete { id name } } } } } } }');

      const divisions = data && data.data && data.data.event && data.data.event.eventDivisions ? data.data.event.eventDivisions : [];

      for (let d = 0; d < divisions.length; d++) {
        const div = divisions[d];
        const divName = div.division && div.division.name ? div.division.name : 'Unknown';
        const leaderboards = div.leaderboards || [];

        for (let lb = 0; lb < leaderboards.length; lb++) {
          const results = leaderboards[lb].result || [];
          for (let r = 0; r < results.length; r++) {
            const result = results[r];
            if (!result.athleteId || !result.place) continue;
            allResults.push({
              athlete_id: String(result.athleteId),
              athlete_name: result.competitor && result.competitor.athlete ? result.competitor.athlete.name : null,
              event_name: event.name,
              division: divName,
              discipline: event.discipline,
              gender: event.gender,
              stars: event.stars,
              place: result.place,
              score: result.total || null,
              event_date: event.start_date,
              updated_at: new Date().toISOString()
            });
          }
        }
      }
      process.stdout.write('Processed ' + (e + 1) + '/' + events.length + ' events, ' + allResults.length + ' results so far\r');
      await new Promise(function(r) { setTimeout(r, 300); });
    } catch(err) {
      console.log('\nError on ' + event.name + ': ' + err.message);
    }
  }

  console.log('\nTotal: ' + allResults.length + ' results, clearing old data...');
  await supabaseDelete('/rest/v1/event_results?id=not.is.null');

  for (let i = 0; i < allResults.length; i += 50) {
    const batch = allResults.slice(i, i + 50);
    await supabaseInsert(batch);
    process.stdout.write('Saved ' + Math.min(i + 50, allResults.length) + '/' + allResults.length + '\r');
  }

  console.log('\nDone!');
}

main();