import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { hapticSuccess } from '../../services/hapticService';
import { playAchievement } from '../../services/soundService';

const { width } = Dimensions.get('window');
const AUTO_DISMISS_MS = 3500;

const AchievementToast = ({ achievement, onDismiss }) => {
  const translateY = useSharedValue(-110);

  const dismiss = () => {
    translateY.value = withTiming(-110, { duration: 280 }, () => runOnJS(onDismiss)());
  };

  useEffect(() => {
    if (!achievement) return;
    translateY.value = -110;
    translateY.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.back(1.4)) });
    hapticSuccess();
    playAchievement();
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievement?.id]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!achievement) return null;

  return (
    <Animated.View style={[styles.wrapper, animStyle]} pointerEvents="box-none">
      <TouchableOpacity activeOpacity={0.85} onPress={dismiss} style={styles.toast}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{achievement.icon}</Text>
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.label}>Achievement Unlocked!</Text>
          <Text style={styles.title} numberOfLines={1}>{achievement.title}</Text>
          <Text style={styles.desc} numberOfLines={1}>{achievement.description}</Text>
        </View>
        <Text style={styles.dismiss}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  toast: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.waveComplete,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: COLORS.waveComplete,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${COLORS.waveComplete}22`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.waveComplete}55`,
  },
  icon: { fontSize: 24 },
  textGroup: { flex: 1 },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.waveComplete,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  desc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  dismiss: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    padding: 4,
  },
});

export default AchievementToast;
