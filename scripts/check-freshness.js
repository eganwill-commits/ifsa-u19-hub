#!/usr/bin/env node
/**
 * Fails the workflow if any data table has gone stale.
 *
 * Why this exists: every data step in sync-ifsa-data.yml is failure-tolerant
 * (`|| echo "... (continuing)"`), so a broken step is completely silent. In
 * Sept 2026 /api/sync-events started timing out and nothing noticed for four
 * weeks — the site served an empty upcoming-events list the whole time.
 * This step turns that silence into a red X.
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const MAX_AGE_HOURS = Number(process.env.FRESHNESS_MAX_AGE_HOURS || 48);
const TABLES = ["ifsa_events", "event_results", "athletes", "rankings_snapshots"];

async function maxUpdatedAt(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=updated_at&order=updated_at.desc&limit=1`;
  const res = await fetch(url, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows[0]?.updated_at ? new Date(rows[0].updated_at) : null;
}

(async () => {
  let failed = false;

  for (const table of TABLES) {
    try {
      const ts = await maxUpdatedAt(table);
      if (!ts) {
        console.error(`FAIL  ${table}: table is empty`);
        failed = true;
        continue;
      }
      const ageHours = (Date.now() - ts.getTime()) / 3_600_000;
      const ok = ageHours <= MAX_AGE_HOURS;
      if (!ok) failed = true;
      console.log(
        `${ok ? "OK   " : "FAIL "} ${table.padEnd(20)} ${ageHours
          .toFixed(1)
          .padStart(7)}h old   (limit ${MAX_AGE_HOURS}h)`
      );
    } catch (err) {
      console.error(`FAIL  ${table}: ${err.message}`);
      failed = true;
    }
  }

  if (failed) {
    console.error(
      "\nData freshness check FAILED — one or more tables stopped updating.\n" +
        "Check the step logs above for the step that silently errored."
    );
    process.exit(1);
  }
  console.log("\nAll tables fresh.");
})();
