import {
  ref, set, remove, onValue, update, serverTimestamp as rtdbTimestamp,
} from 'firebase/database';
import { rtdb } from './firebase';

export const getSessionId = (uid1, uid2) => [uid1, uid2].sort().join('_');

export const sendCoopInvite = (fromUserId, fromUsername, fromAvatarId, toUserId) =>
  set(ref(rtdb, `coopInvites/${toUserId}/${fromUserId}`), {
    fromUserId,
    fromUsername,
    fromAvatarId: fromAvatarId ?? '🧭',
    sentAt: rtdbTimestamp(),
  });

export const cancelCoopInvite = (fromUserId, toUserId) =>
  remove(ref(rtdb, `coopInvites/${toUserId}/${fromUserId}`));

export const declineCoopInvite = (fromUserId, toUserId) =>
  remove(ref(rtdb, `coopInvites/${toUserId}/${fromUserId}`));

export const acceptCoopInvite = async (hostId, guestId) => {
  const sessionId = getSessionId(hostId, guestId);
  await set(ref(rtdb, `coopSessions/${sessionId}`), {
    hostId,
    guestId,
    status: 'active',
    startedAt: rtdbTimestamp(),
    progress: {
      [hostId]: { phase: 'idle', timeLeft: 0, sessionCount: 0 },
      [guestId]: { phase: 'idle', timeLeft: 0, sessionCount: 0 },
    },
  });
  await remove(ref(rtdb, `coopInvites/${guestId}/${hostId}`));
  return sessionId;
};

export const listenForInvites = (userId, callback) =>
  onValue(ref(rtdb, `coopInvites/${userId}`), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    const entries = Object.entries(snap.val());
    if (entries.length === 0) { callback(null); return; }
    callback(entries[0][1]);
  });

export const listenCoopSession = (sessionId, callback) =>
  onValue(ref(rtdb, `coopSessions/${sessionId}`), (snap) =>
    callback(snap.exists() ? { sessionId, ...snap.val() } : null));

export const updateCoopProgress = (sessionId, userId, progress) =>
  update(ref(rtdb, `coopSessions/${sessionId}/progress/${userId}`), progress);

export const endCoopSession = (sessionId) =>
  remove(ref(rtdb, `coopSessions/${sessionId}`));
