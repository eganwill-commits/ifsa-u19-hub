// LiveHeats names are typed by families, so casing is all over the place
// ("bruno hernan quezada quijada", "GASPAR URREJOLA FUENZALIDA"). Only fix names
// that are entirely lower- or upper-case; leave deliberate casing ("McLean",
// "DeLuca") alone.
const LOWER_PARTICLES = new Set(['de', 'del', 'della', 'da', 'di', 'du', 'la', 'le', 'van', 'von', 'y', 'dos', 'das']);

export function prettyName(name: string | null | undefined): string {
  if (!name) return '';
  const n = name.trim().replace(/\s+/g, ' ');
  const hasLetters = /\p{L}/u.test(n);
  if (!hasLetters) return n;
  if (n !== n.toLowerCase() && n !== n.toUpperCase()) return n;
  return n.toLowerCase().split(' ').map((w, i) => {
    if (i > 0 && LOWER_PARTICLES.has(w)) return w;
    return w.split(/([-'’])/).map((p) => (p.length && !/[-'’]/.test(p) ? p[0].toUpperCase() + p.slice(1) : p)).join('');
  }).join(' ');
}
