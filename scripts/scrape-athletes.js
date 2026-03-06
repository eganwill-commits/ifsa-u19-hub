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
  const events = await supabaseRequest('GET', '/rest/v1/ifsa_events?select=id,name,liveheats_url&liveheats_url=not.is.null');
  console.log(`Found ${events.length} events with LiveHeats URLs`);

  const athletes = new Map();

  for (const event of events) {
    try {
      const match = event.liveheats_url.match(/events\/(\d+)/);
      if (!match) continue;
      const eventId = match[1];

      const result = await graphql(`query {
        event(id: ${eventId}) {
          eventDivisions {
            entries {
              athlete {
                id
                name
              }
            }
          }
        }
      }`);

      const divisions = result?.data?.event?.eventDivisions || [];
      for (const div of divisions) {
        for (const entry of div.entries || []) {
          const a = entry.athlete;
          if (a?.id && a?.name) {
            athletes.set(String(a.id), {
              id: String(a.id),
              name: a.name,
              liveheats_url: `https://liveheats.com/athletes/${a.id}`,
              updated_at: new Date().toISOString()
            });
          }
        }
      }
      process.stdout.write(`✓ ${athletes.size} athletes so far\r`);
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.log(`✗ Error on ${event.liveheats_url}`);
    }
  }

  console.log(`\nFound ${athletes.size} unique athletes, saving to Supabase...`);

  const batch = [...athletes.values()];
  for (let i = 0; i < batch.length; i += 50) {
    await supabaseRequest('POST', '/rest/v1/athletes', batch.slice(i, i + 50));
    console.log(`Saved ${Math.min(i + 50, batch.length)}/${batch.length}`);
  }

  console.log('Done!');
}

main();
