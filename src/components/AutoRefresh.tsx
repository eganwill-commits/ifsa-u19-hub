'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Silently re-renders the current server component on an interval so live data
 * (LiveHeats entries/results) updates on screen without a manual refresh.
 * Pauses while the tab is hidden to avoid needless work.
 */
export default function AutoRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        router.refresh();
      }
    };
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
