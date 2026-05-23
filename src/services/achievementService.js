import { doc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from './firebase';
import { ACHIEVEMENTS } from '../constants/achievements';

const checkCondition = (condition, data, sessionData) => {
  const { type, value } = condition;
  switch (type) {
    case 'totalPomodoros':  return (data.totalPomodoros ?? 0) >= value;
    case 'zonesDiscovered': return (data.discoveredZones?.length ?? 0) >= value;
    case 'zonesRestored':   return (data.zonesRestoredCount ?? 0) >= value;
    case 'coopSessions':    return (data.coopSessionsCount ?? 0) >= value;
    case 'streak':          return (data.currentStreak ?? 0) >= value;
    case 'nightSessions':   return (data.nightSessionsCount ?? 0) >= value;
    case 'morningSessions': return (data.morningSessionsCount ?? 0) >= value;
    case 'longSession':     return (sessionData?.durationMinutes ?? 0) >= value;
    case 'shields':         return (data.shieldCount ?? 0) >= value;
    default: return false;
  }
};

// Call after each session to increment per-session counters
export const trackSessionStats = async (userId, { isNight, isMorning, isCoop }) => {
  const updates = {};
  if (isNight)  updates.nightSessionsCount = increment(1);
  if (isMorning) updates.morningSessionsCount = increment(1);
  if (isCoop)   updates.coopSessionsCount = increment(1);
  if (Object.keys(updates).length === 0) return;
  await updateDoc(doc(db, 'users', userId), updates).catch(() => {});
};

// Call when contributeToZone returns isRestored = true
export const trackZoneRestored = async (userId) => {
  await updateDoc(doc(db, 'users', userId), {
    zonesRestoredCount: increment(1),
  }).catch(() => {});
};

// Check all achievements and write newly unlocked ones. Returns newly unlocked array.
export const checkAndUnlockAchievements = async (userId, sessionData = {}) => {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return [];

  const data = snap.data();
  const unlocked = new Set(data.unlockedAchievements ?? []);

  const newlyUnlocked = ACHIEVEMENTS.filter(
    (a) => !unlocked.has(a.id) && checkCondition(a.condition, data, sessionData),
  );

  if (newlyUnlocked.length > 0) {
    await updateDoc(doc(db, 'users', userId), {
      unlockedAchievements: arrayUnion(...newlyUnlocked.map((a) => a.id)),
    });
  }

  return newlyUnlocked;
};
