/**
 * Followed athletes, stored in the browser.
 *
 * Deliberately no accounts: a parent following one or two kids should not have to
 * sign up. The trade-off is that follows do not travel between devices.
 *
 * Every read/write is wrapped -- localStorage throws in private mode and in some
 * embedded webviews, and a parent losing their follow list is better than a page
 * that will not render.
 */

import { useEffect, useState } from 'react';

const KEY = 'ifsa-hub:followed-athletes';
export const FOLLOW_EVENT = 'ifsa-hub:follows-changed';

export type FollowedAthlete = { id: string; name: string };

function read(): FollowedAthlete[] {
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

function write(list: FollowedAthlete[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Out of quota or storage blocked -- the in-memory event below still fires so
    // the current page stays consistent for this session.
  }
  window.dispatchEvent(new CustomEvent(FOLLOW_EVENT));
}

export function getFollows(): FollowedAthlete[] {
  return read();
}

export function isFollowing(id: string): boolean {
  return read().some((a) => a.id === id);
}

export function follow(athlete: FollowedAthlete) {
  const list = read();
  if (list.some((a) => a.id === athlete.id)) return;
  write([...list, athlete]);
}

export function unfollow(id: string) {
  write(read().filter((a) => a.id !== id));
}

export function toggleFollow(athlete: FollowedAthlete): boolean {
  const following = isFollowing(athlete.id);
  if (following) unfollow(athlete.id);
  else follow(athlete);
  return !following;
}

/**
 * Starts empty so server and first client render match, then fills in after mount.
 * Listens for same-tab changes (FOLLOW_EVENT) and other-tab changes ('storage').
 */
export function useFollows(): { follows: FollowedAthlete[]; ready: boolean } {
  const [follows, setFollows] = useState<FollowedAthlete[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setFollows(read());
    sync();
    setReady(true);
    window.addEventListener(FOLLOW_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FOLLOW_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { follows, ready };
}
