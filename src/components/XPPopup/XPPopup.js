import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { hapticMedium } from '../../services/hapticService';

const XPPopup = ({ xp, coins, earnedShield, visible, onDone }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    if (!visible) return;

    hapticMedium();
    opacity.value = 0;
    translateY.value = 0;
    scale.value = 0.6;

    opacity.value = withSequence(
      withTiming(1, { duration: 300, easing: Easing.out(Easing.back(2)) }),
      withDelay(900, withTiming(0, { duration: 400 })),
    );
    scale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.back(2)) });
    translateY.value = withSequence(
      withTiming(-30, { duration: 300 }),
      withDelay(600, withTiming(-80, { duration: 500, easing: Easing.in(Easing.ease) })),
    );

    const timer = setTimeout(() => onDone?.(), 1800);
    return () => clearTimeout(timer);
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animStyle]} pointerEvents="none">
      <Animated.Text style={styles.xpText}>+{xp} XP</Animated.Text>
      {coins > 0 && <Animated.Text style={styles.coinsText}>+{coins} 🪙</Animated.Text>}
      {earnedShield && <Animated.Text style={styles.shieldText}>+1 🛡️ Shield!</Animated.Text>}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  xpText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.waveComplete,
    letterSpacing: 1,
    textShadowColor: COLORS.waveComplete,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  coinsText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gold,
    marginTop: 2,
  },
  shieldText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.waveActive,
    marginTop: 2,
  },
});

export default XPPopup;
