const https = require('https');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && key.trim()) envVars[key.trim()] = val.join('=').trim();
});

const U = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const K = envVars['SUPABASE_SERVICE_KEY'];

function apiFetch(url, opt) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const r = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: opt.method || 'GET',
      headers: opt.headers || {}
    }, rs => {
      let d = '';
      rs.on('data', c => d += c);
      rs.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
    });
    r.on('error', reject);
    if (opt.body) r.write(opt.body);
    r.end();
  });
}

async function run() {
  const evts = await apiFetch(
    U + '/rest/v1/ifsa_events?liveheats_url=is.null&select=id,name',
    { headers: { apikey: K, Authorization: 'Bearer ' + K } }
  );
  console.log('Events to match: ' + evts.length);

  let n = 0;
  for (const e of evts) {
    const s = e.name.replace(/^\d{4}\s+/, '').replace(/"/g, '');
    const body = JSON.stringify({
      query: 'query { eventsByName(search: "' + s + '", limit: 5) { id name } }'
    });

    let rs = [];
    try {
      const x = await apiFetch('https://liveheats.com/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      rs = (x && x.data && x.data.eventsByName) || [];
    } catch (err) {
      console.log('error: ' + e.name);
      continue;
    }

    if (!rs.length) {
      console.log('no match: ' + e.name);
      continue;
    }

    const sim = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const best = rs.find(r => sim(r.name) === sim(e.name)) || rs[0];
    const url = 'https://liveheats.com/events/' + best.id;

    await apiFetch(U + '/rest/v1/ifsa_events?id=eq.' + e.id, {
      method: 'PATCH',
      headers: {
        apikey: K,
        Authorization: 'Bearer ' + K,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ liveheats_url: url })
    });

    console.log('matched: ' + e.name + ' -> ' + url);
    n++;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('Done: ' + n + '/' + evts.length);
}

run().catch(console.error);