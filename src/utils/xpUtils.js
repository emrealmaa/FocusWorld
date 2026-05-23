export const XP_PER_POMODORO = 10;
export const XP_PER_COOP_FRIEND = 5;
export const XP_ZONE_RESTORE_BONUS = 50;
export const XP_PER_LEVEL = 100;

export const COINS_PER_POMODORO = 5;

export const calculateLevel = (xp) => Math.floor(xp / XP_PER_LEVEL);

export const xpToNextLevel = (xp) => {
  const currentLevelXp = (calculateLevel(xp)) * XP_PER_LEVEL;
  return xp - currentLevelXp;
};

export const xpProgressPercent = (xp) => {
  return (xpToNextLevel(xp) / XP_PER_LEVEL) * 100;
};

export const calculateSessionRewards = (durationMinutes, coopFriendCount = 0) => {
  const pomodoroCount = Math.floor(durationMinutes / 25);
  const baseXp = pomodoroCount * XP_PER_POMODORO;
  const coopXp = coopFriendCount * XP_PER_COOP_FRIEND;
  const coins = pomodoroCount * COINS_PER_POMODORO;
  return { xp: baseXp + coopXp, coins };
};
