import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { isSameDay } from '../utils/timeUtils';

export const startSession = async (userId, durationMinutes, zoneId = null, isCoOp = false) => {
  const ref = await addDoc(collection(db, 'sessions'), {
    userId,
    startTime: serverTimestamp(),
    endTime: null,
    durationMinutes,
    completed: false,
    zoneContributedTo: zoneId,
    isCoOp,
    coOpPartners: [],
    waveDisturbanceCount: 0,
  });
  return ref.id;
};

export const completeSession = async (sessionId, disturbanceCount = 0) => {
  await updateDoc(doc(db, 'sessions', sessionId), {
    endTime: serverTimestamp(),
    completed: true,
    waveDisturbanceCount: disturbanceCount,
  });
};

export const getTodaysSessions = async (userId) => {
  const q = query(
    collection(db, 'sessions'),
    where('userId', '==', userId),
    where('completed', '==', true),
    orderBy('startTime', 'desc'),
    limit(50),
  );
  const snap = await getDocs(q);
  const today = new Date();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.startTime && isSameDay(s.startTime.toDate(), today));
};
