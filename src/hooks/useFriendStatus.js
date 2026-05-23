import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../services/firebase';
import { formatRelativeTime } from '../utils/timeUtils';

// Returns { [userId]: { status, lastSeen, label } }
export const useFriendStatus = (friendIds = []) => {
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    if (friendIds.length === 0) {
      setStatuses({});
      return;
    }

    const unsubscribers = friendIds.map((uid) => {
      const presenceRef = ref(rtdb, `presence/${uid}`);
      return onValue(presenceRef, (snap) => {
        const data = snap.val();
        const status = data?.status ?? 'offline';
        const lastSeen = data?.lastSeen ?? null;

        let label = 'Offline';
        if (status === 'focusing') label = 'Focusing now 🔥';
        else if (status === 'online') label = 'Online';
        else if (lastSeen) label = `Last seen ${formatRelativeTime(lastSeen)}`;

        setStatuses((prev) => ({
          ...prev,
          [uid]: { status, lastSeen, label },
        }));
      });
    });

    return () => unsubscribers.forEach((u) => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendIds.join(',')]);

  return statuses;
};
