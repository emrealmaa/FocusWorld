import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  limit,
} from 'firebase/firestore';
import {
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp as rtdbTimestamp,
} from 'firebase/database';
import { db, rtdb } from './firebase';

// ── Friend requests ──────────────────────────────────────────────────────────

export const sendFriendRequest = async (fromUserId, toUserId) => {
  const existing = await getDocs(
    query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId),
      where('status', '==', 'pending'),
    ),
  );
  if (!existing.empty) return { alreadySent: true };

  await addDoc(collection(db, 'friendRequests'), {
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return { alreadySent: false };
};

export const respondToFriendRequest = async (requestId, accepted, fromUserId, toUserId) => {
  await updateDoc(doc(db, 'friendRequests', requestId), {
    status: accepted ? 'accepted' : 'rejected',
  });
  if (accepted) {
    await Promise.all([
      updateDoc(doc(db, 'users', fromUserId), { friendIds: arrayUnion(toUserId) }),
      updateDoc(doc(db, 'users', toUserId), { friendIds: arrayUnion(fromUserId) }),
    ]);
  }
};

export const getPendingRequests = async (userId) => {
  const snap = await getDocs(
    query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const hasPendingRequestBetween = async (fromUserId, toUserId) => {
  const snap = await getDocs(
    query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId),
      where('status', '==', 'pending'),
    ),
  );
  return !snap.empty;
};

// ── User search ──────────────────────────────────────────────────────────────

export const searchUsersByUsername = async (username) => {
  const snap = await getDocs(
    query(
      collection(db, 'users'),
      where('username', '==', username),
      limit(10),
    ),
  );
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
};

// ── Batch profile fetch ──────────────────────────────────────────────────────

export const getFriendProfiles = async (friendIds) => {
  if (!friendIds || friendIds.length === 0) return [];
  const snaps = await Promise.all(friendIds.map((id) => getDoc(doc(db, 'users', id))));
  return snaps.filter((s) => s.exists()).map((s) => ({ uid: s.id, ...s.data() }));
};

// ── RTDB Presence ────────────────────────────────────────────────────────────

export const setupPresence = (userId) => {
  const presenceRef = ref(rtdb, `presence/${userId}`);
  const connectedRef = ref(rtdb, '.info/connected');

  const unsubscribe = onValue(connectedRef, (snap) => {
    if (snap.val() !== true) return;

    onDisconnect(presenceRef).set({
      status: 'offline',
      lastSeen: rtdbTimestamp(),
    });

    set(presenceRef, {
      status: 'online',
      lastSeen: rtdbTimestamp(),
    });
  });

  return unsubscribe;
};

export const setFocusStatus = (userId, isFocusing) =>
  set(ref(rtdb, `presence/${userId}`), {
    status: isFocusing ? 'focusing' : 'online',
    lastSeen: rtdbTimestamp(),
  });
