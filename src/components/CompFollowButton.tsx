'use client';
import { useEffect, useState } from 'react';
import { COMP_FOLLOW_EVENT, isFollowingComp, toggleCompFollow } from '@/lib/compFollows';

export default function CompFollowButton({ compId, compName }: { compId: string; compName: string }) {
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setFollowing(isFollowingComp(compId));
    sync();
    setReady(true);
    window.addEventListener(COMP_FOLLOW_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(COMP_FOLLOW_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [compId]);

  return (
    <button
      onClick={() => setFollowing(toggleCompFollow({ id: compId, name: compName }))}
      aria-pressed={following}
      title={following ? 'Remove from your comps' : 'Save this comp to your home page and calendar feed'}
      style={{
        padding: '6px 14px', borderRadius: 999, border: following ? '1px solid #ffcc00' : '1px solid #333',
        background: following ? '#ffcc00' : 'transparent', color: following ? '#000' : '#e8e8e8',
        fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: ready ? 1 : 0.6,
      }}
    >
      {following ? '★ My comp' : '☆ Add to my comps'}
    </button>
  );
}
