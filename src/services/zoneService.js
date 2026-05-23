import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  increment,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

export const contributeToZone = async (zoneId, userId) => {
  const zoneRef = doc(db, 'zones', zoneId);
  const snap = await getDoc(zoneRef);

  if (!snap.exists()) return;

  const data = snap.data();
  const newTotal = (data.currentTotalPomodoros || 0) + 1;
  const isRestored = newTotal >= data.totalPomodorosRequired;

  await updateDoc(zoneRef, {
    currentTotalPomodoros: increment(1),
    [`contributors.${userId}`]: increment(1),
    isRestored,
  });

  return isRestored;
};

export const getZoneData = async (zoneId) => {
  const snap = await getDoc(doc(db, 'zones', zoneId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const getAllZones = async () => {
  const snap = await getDocs(collection(db, 'zones'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const discoverZone = async (userId, zoneId) => {
  await updateDoc(doc(db, 'users', userId), {
    discoveredZones: arrayUnion(zoneId),
  });
};
