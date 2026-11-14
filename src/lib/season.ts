// IFSA Junior seasons run July → June and are named for the year they END:
// the "2027" season covers 2026-07-01 … 2027-06-30 (Southern Hemisphere comps in
// Jul–Sep, Northern Hemisphere comps in Jan–Apr).

/** Season year a given date belongs to (e.g. 2026-11-13 → 2027). */
export function seasonOf(date: Date = new Date()): number {
  const y = date.getUTCFullYear();
  return date.getUTCMonth() >= 6 ? y + 1 : y; // getUTCMonth: 6 = July
}

/**
 * Earliest start_date (YYYY-MM-DD) the comp list should show: the first day of
 * LAST season. Keeps the current + previous season visible; anything older drops
 * off automatically each July. Rankings/results are unaffected — this only
 * filters which comps are listed.
 */
export function compListCutoff(date: Date = new Date()): string {
  return `${seasonOf(date) - 2}-07-01`;
}
