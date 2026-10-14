'use client';
import { useEffect, useState } from 'react';
import { FOLLOW_EVENT, isFollowing, toggleFollow } from '@/lib/follows';

export default function FollowButton({ athleteId, athleteName }: { athleteId: string; athleteName: string }) {
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setFollowing(isFollowing(athleteId));
    sync();
    setReady(true);
    window.addEventListener(FOLLOW_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FOLLOW_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [athleteId]);

  return (
    <button
      onClick={() => setFollowing(toggleFollow({ id: athleteId, name: athleteName }))}
      aria-pressed={following}
      style={{
        padding: '8px 16px',
        borderRadius: 999,
        border: following ? '1px solid #ffcc00' : '1px solid #333',
        background: following ? '#ffcc00' : 'transparent',
        color: following ? '#000' : '#e8e8e8',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        opacity: ready ? 1 : 0.6,
      }}
      title={following ? 'Remove from your followed athletes' : 'Follow to see this athlete on your home page'}
    >
      {following ? '★ Following' : '☆ Follow'}
    </button>
  );
}
