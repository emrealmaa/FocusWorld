import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SETTINGS_KEY = '@fw_settings';
const DAILY_ID_KEY  = '@fw_daily_notif_id';
const STREAK_ID_KEY = '@fw_streak_notif_id';

export const DEFAULT_SETTINGS = {
  dailyReminderEnabled: false,
  dailyReminderHour: 8,
  dailyReminderMinute: 0,
  streakSaverEnabled: false,
};

// ── Persist ───────────────────────────────────────────────────────────────────

export const loadSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = async (settings) => {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
};

// ── Permission ────────────────────────────────────────────────────────────────

export const requestPermission = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FocusWorld',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return status === 'granted';
};

// ── Daily reminder ────────────────────────────────────────────────────────────

export const scheduleDailyReminder = async (hour, minute) => {
  const existingId = await AsyncStorage.getItem(DAILY_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to focus! ⏱',
      body: 'Your world is waiting to be explored. 🗺️',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  await AsyncStorage.setItem(DAILY_ID_KEY, id);
  return id;
};

export const cancelDailyReminder = async () => {
  const id = await AsyncStorage.getItem(DAILY_ID_KEY);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await AsyncStorage.removeItem(DAILY_ID_KEY);
  }
};

// ── Streak saver (fires daily at 21:00) ──────────────────────────────────────

export const scheduleStreakSaver = async () => {
  const existingId = await AsyncStorage.getItem(STREAK_ID_KEY);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Don't break your streak! 🔥",
      body: "You haven't focused yet today. A few minutes is all it takes.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });

  await AsyncStorage.setItem(STREAK_ID_KEY, id);
  return id;
};

export const cancelStreakSaver = async () => {
  const id = await AsyncStorage.getItem(STREAK_ID_KEY);
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    await AsyncStorage.removeItem(STREAK_ID_KEY);
  }
};
