/**
 * Followed comps, stored in the browser (same pattern as followed comps).
 *
 * A comp is stored by one of its ifsa_events row ids (any division row works:
 * the calendar feed expands it to the whole comp via ifsa_url).
 *
 * Deliberately no accounts: a parent following one or two kids should not have to
 * sign up. The trade-off is that follows do not travel between devices.
 *
 * Every read/write is wrapped -- localStorage throws in private mode and in some
 * embedded webviews, and a parent losing their follow list is better than a page
 * that will not render.
 */

import { useEffect, useState } from 'react';

const KEY = 'ifsa-hub:followed-comps';
export const COMP_FOLLOW_EVENT = 'ifsa-hub:comp-follows-changed';

export type FollowedComp = { id: string; name: string };

function read(): FollowedComp[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a) => a && typeof a.id === 'string' && typeof a.name === 'string')
      .map((a) => ({ id: a.id, name: a.name }));
  } catch {
    return [];
  }
}

function write(list: FollowedComp[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Out of quota or storage blocked -- the in-memory event below still fires so
    // the current page stays consistent for this session.
  }
  window.dispatchEvent(new CustomEvent(COMP_FOLLOW_EVENT));
}

export function getCompFollows(): FollowedComp[] {
  return read();
}

export function isFollowingComp(id: string): boolean {
  return read().some((a) => a.id === id);
}

export function followComp(comp: FollowedComp) {
  const list = read();
  if (list.some((a) => a.id === comp.id)) return;
  write([...list, comp]);
}

export function unfollowComp(id: string) {
  write(read().filter((a) => a.id !== id));
}

export function toggleCompFollow(comp: FollowedComp): boolean {
  const following = isFollowingComp(comp.id);
  if (following) unfollowComp(comp.id);
  else followComp(comp);
  return !following;
}

/**
 * Starts empty so server and first client render match, then fills in after mount.
 * Listens for same-tab changes (COMP_FOLLOW_EVENT) and other-tab changes ('storage').
 */
export function useCompFollows(): { follows: FollowedComp[]; ready: boolean } {
  const [follows, setFollows] = useState<FollowedComp[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setFollows(read());
    sync();
    setReady(true);
    window.addEventListener(COMP_FOLLOW_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(COMP_FOLLOW_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { follows, ready };
}
