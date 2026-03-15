require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function graphql(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const options = {
      hostname: 'liveheats.com',
      path: '/api/graphql',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data ? JSON.parse(data) : {}));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const events = await supabaseRequest('GET', '/rest/v1/ifsa_events?select=id,name,discipline,gender,stars,start_date,liveheats_url&liveheats_url=not.is.null&status=eq.completed');
  console.log(`Found ${events.length} completed events with LiveHeats URLs`);

  const results = [];

  for (const event of events) {
    try {
      const match = event.liveheats_url.match(/events\/(\d+)/);
      if (!match) continue;
      const eventId = match[1];

      const data = await graphql(`query {
        event(id: ${eventId}) {
          name
          eventDivisions {
            division {
              name
            }
            leaderboards {
              result {
                place
                total
                athleteId
                competitor {
                  athlete {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }`);

      const divisions = data?.data?.event?.eventDivisions || [];
      for (const div of divisions) {
        const divName = div.division?.name || 'Unknown';
        for (const lb of div.leaderboards || []) {
          for (const r of lb.result || []) {
            if (!r.athleteId || !r.place) continue;
            results.push({
              athlete_id: String(r.athleteId),
              athlete_name: r.competitor?.athlete?.name || null,
              event_id: event.id,
              event_name: event.name,
              division: divName,
              discipline: event.discipline,
              gender: event.gender,
              stars: event.stars,
              place: r.place,
              score: r.total ?? null,
              event_date: event.start_date,
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
      process.stdout.write(`✓ ${results.length} results from ${events.indexOf(event) + 1}/${events.length} events\r`);
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`\n✗ Error on ${event.name}: ${e.message}`);
    }
  }

  console.log(`\nFound ${results.length} total results, saving to Supabase...`);

  // Clear old data first
  await supabaseRequest('DELETE', '/rest/v1/rankings_snapshots?id=not.is.null');

  for (let i = 0; i < results.length; i += 50) {
    await supabaseRequest('POST', '/rest/v1/rankings_snapshots', results.slice(i, i + 50));
    process.stdout.write(`Saved ${Math.min(i + 50, results.length)}/${results.length}\r`);
  }

  console.log('\nDone!');
}

main();