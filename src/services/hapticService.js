import * as Haptics from 'expo-haptics';

const safe = (fn) => {
  try { fn(); } catch {}
};

export const hapticLight   = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const hapticMedium  = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const hapticHeavy   = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
export const hapticSuccess = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const hapticWarning = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
export const hapticError   = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
