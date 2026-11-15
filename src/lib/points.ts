// Region 2 IFSA Junior points table — 2026-2027 Athlete Series Rulebook,
// Appendix 1 (pp. 60-62, updated June 1, 2026).
//
// Rules from the rulebook (pp. 17, 31, 36, 60):
//  - Points for every finish except U12 (U12 is unranked).
//  - Base value by finish up to 44th; 45th and below get the 44th-place base.
//  - Plus 1 point for every athlete beaten in the division.
//  - Ranking = best 3 of the first 4 point-scoring comps (June 1 – May 31),
//    plus JFC points on top. Max three 3* comps per season.
//  - 3* with only 2 competitors: 1st gets 2nd-place points +1 (836), 2nd gets 3rd (738).
//    Only 1 competitor: 3rd-place points (738).

export type Tier = "2" | "3" | "JFC";

// [JFC, 3*, 2*] for places 1..44
const TABLE: [number, number, number][] = [
  [1250, 1000, 600], [1044, 835, 501], [923, 738, 442], [837, 670, 402], [771, 617, 370],
  [717, 573, 343], [671, 537, 322], [631, 505, 303], [596, 477, 286], [565, 452, 271],
  [536, 429, 257], [510, 408, 244], [487, 389, 233], [465, 372, 223], [444, 355, 213],
  [425, 340, 204], [407, 325, 195], [390, 312, 187], [374, 299, 179], [358, 287, 172],
  [344, 275, 165], [330, 264, 158], [317, 253, 151], [304, 243, 145], [292, 234, 140],
  [280, 224, 134], [269, 215, 129], [258, 207, 124], [248, 198, 118], [238, 190, 114],
  [228, 182, 109], [219, 175, 105], [209, 167, 100], [200, 160, 96], [192, 153, 91],
  [183, 147, 88], [175, 140, 84], [167, 134, 80], [160, 128, 76], [152, 122, 73],
  [145, 116, 69], [138, 110, 66], [131, 104, 62], [125, 100, 60],
];

const COL: Record<Tier, number> = { JFC: 0, "3": 1, "2": 2 };

export const RULEBOOK_POINTS_PAGE = 60;

/** Base points for a finish (no "+1 per athlete beaten"). */
export function basePoints(tier: Tier, place: number): number {
  const row = TABLE[Math.min(Math.max(place, 1), TABLE.length) - 1];
  return row[COL[tier]];
}

/**
 * Points actually earned: base + 1 per athlete beaten. Pass the division's
 * field size when known. Applies the small-field 3* rule.
 */
export function pointsFor(tier: Tier, place: number, fieldSize?: number | null): number {
  if (tier === "3" && fieldSize != null && fieldSize <= 2) {
    if (fieldSize === 1) return 738;
    return place === 1 ? 836 : 738;
  }
  const beaten = fieldSize != null ? Math.max(fieldSize - place, 0) : 0;
  return basePoints(tier, place) + beaten;
}

export function tierFromStars(stars: number | null | undefined): Tier | null {
  if (stars === 2) return "2";
  if (stars === 3) return "3";
  return null;
}

/** Rows for display: [place, JFC, 3*, 2*]. */
export function pointsTableRows(maxPlace = 44): [number, number, number, number][] {
  return TABLE.slice(0, maxPlace).map((r, i) => [i + 1, r[0], r[1], r[2]]);
}
