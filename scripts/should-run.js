#!/usr/bin/env node
/**
 * Gate for the hourly sync workflow. Prints `run=true|false` to $GITHUB_OUTPUT.
 *
 * Full sync when:
 *   - triggered by hand (workflow_dispatch), or
 *   - it's the daily slot (12 UTC), or
 *   - any comp is happening now (start-1 day … end+1 day): live results and
 *     rankings should update hourly on comp weekends.
 * Otherwise the hourly run exits in seconds. No dependencies (runs before npm ci).
 */
const fs = require('fs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

function out(run, why) {
  console.log((run ? 'RUN: ' : 'SKIP: ') + why);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\n`);
}

(async () => {
  if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') return out(true, 'manual run');
  const now = new Date();
  if (now.getUTCHours() === 12) return out(true, 'daily slot');
  if (!SUPABASE_URL || !KEY) return out(true, 'no Supabase credentials to check; running to be safe');

  const day = (n) => new Date(now.getTime() + n * 86400000).toISOString().slice(0, 10);
  // A comp is "on" if start <= tomorrow and (end ?? start) >= yesterday.
  const url = `${SUPABASE_URL}/rest/v1/ifsa_events?select=name&hidden=eq.false&start_date=lte.${day(1)}` +
    `&or=(end_date.gte.${day(-1)},and(end_date.is.null,start_date.gte.${day(-1)}))&limit=1`;
  try {
    const res = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!res.ok) return out(true, `check failed (HTTP ${res.status}); running to be safe`);
    const rows = await res.json();
    if (rows.length) return out(true, `comp in progress: ${rows[0].name}`);
    return out(false, 'no comp in progress and not the daily slot');
  } catch (err) {
    return out(true, `check errored (${err.message}); running to be safe`);
  }
})();
