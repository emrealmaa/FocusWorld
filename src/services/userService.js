import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { XP_PER_POMODORO, XP_PER_COOP_FRIEND, COINS_PER_POMODORO, calculateLevel } from '../utils/xpUtils';
import { isSameDay } from '../utils/timeUtils';

const SHIELD_COST = 50;

export const updateUserAfterSession = async (userId, { durationMinutes, coopFriendCount = 0 }) => {
  const pomodoroCount = Math.max(1, Math.floor(durationMinutes / 25));
  const xpGained = pomodoroCount * XP_PER_POMODORO + coopFriendCount * XP_PER_COOP_FRIEND;
  const coinsGained = pomodoroCount * COINS_PER_POMODORO;

  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  const currentXP = snap.exists() ? (snap.data().xp ?? 0) : 0;
  const oldLevel = calculateLevel(currentXP);
  const newLevel = calculateLevel(currentXP + xpGained);

  await updateDoc(userRef, {
    totalPomodoros: increment(pomodoroCount),
    totalFocusMinutes: increment(durationMinutes),
    xp: increment(xpGained),
    coins: increment(coinsGained),
  });

  return { xpGained, coinsGained, pomodoroCount, leveledUp: newLevel > oldLevel, newLevel };
};

export const buyShield = async (userId) => {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User not found');
  const coins = snap.data().coins ?? 0;
  if (coins < SHIELD_COST) throw new Error('Not enough coins');
  await updateDoc(userRef, {
    coins: increment(-SHIELD_COST),
    shieldCount: increment(1),
  });
};

const STREAK_MILESTONES = new Set([7, 14, 21, 30, 50, 100]);

export const updateStreak = async (userId) => {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const now = new Date();
  const lastFocus = data.lastFocusDate?.toDate?.() ?? null;

  if (lastFocus && isSameDay(lastFocus, now)) {
    return; // Already focused today
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isConsecutive = lastFocus && isSameDay(lastFocus, yesterday);

  let newStreak;
  let shieldCount = data.shieldCount ?? 0;

  if (isConsecutive) {
    newStreak = (data.currentStreak ?? 0) + 1;
  } else if (!lastFocus) {
    newStreak = 1;
  } else {
    // Streak broken — check for shield
    if (shieldCount > 0) {
      newStreak = (data.currentStreak ?? 0) + 1;
      shieldCount -= 1;
    } else {
      newStreak = 1;
    }
  }

  // Award shield every 7-day streak
  const earnedShield = newStreak > 0 && newStreak % 7 === 0;

  await updateDoc(userRef, {
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, data.longestStreak ?? 0),
    lastFocusDate: now,
    shieldCount: earnedShield ? shieldCount + 1 : shieldCount,
  });

  const milestoneDay = STREAK_MILESTONES.has(newStreak) ? newStreak : null;
  return { newStreak, earnedShield, milestoneDay };
};

export const updateAvatarId = async (userId, avatarId) => {
  await updateDoc(doc(db, 'users', userId), { avatarId });
};

export const getDailyGoal = async (userId) => {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return 4;
  return snap.data().dailyGoal ?? 4;
};

export const setDailyGoal = async (userId, goal) => {
  await updateDoc(doc(db, 'users', userId), { dailyGoal: goal });
};
