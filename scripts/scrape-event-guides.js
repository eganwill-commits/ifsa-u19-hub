require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data || '[]')));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {

  const events = await supabaseRequest('GET', '/rest/v1/ifsa_events?select=id,ifsa_url&order=start_date.asc');
  console.log(`Found ${events.length} events`);

  let matched = 0;
  for (const event of events) {
    try {
      const html = await fetchUrl(event.ifsa_url);
      const match = html.match(/href="(https:\/\/docs\.google\.com\/[^"]+)"/);
      if (match) {
        await supabaseRequest('PATCH', `/rest/v1/ifsa_events?id=eq.${event.id}`, { event_guide_url: match[1] });
        console.log(`✓ ${event.ifsa_url}`);
        matched++;
      } else {
        console.log(`- No guide: ${event.ifsa_url}`);
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`✗ Error: ${event.ifsa_url}`);
    }
  }
  console.log(`\nDone! Matched ${matched}/${events.length}`);
}

main();