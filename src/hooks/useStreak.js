import { useState, useEffect } from 'react';
import { isSameDay } from '../utils/timeUtils';

export const useStreak = (profile) => {
  const [todayHasFocus, setTodayHasFocus] = useState(false);

  useEffect(() => {
    if (!profile?.lastFocusDate) {
      setTodayHasFocus(false);
      return;
    }
    const last = profile.lastFocusDate?.toDate?.() ?? new Date(profile.lastFocusDate);
    setTodayHasFocus(isSameDay(last, new Date()));
  }, [profile?.lastFocusDate]);

  const streak = profile?.currentStreak ?? 0;
  const longestStreak = profile?.longestStreak ?? 0;
  const shieldCount = profile?.shieldCount ?? 0;

  return { streak, longestStreak, shieldCount, todayHasFocus };
};
