import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { hapticHeavy } from '../../services/hapticService';
import { playLevelUp } from '../../services/soundService';

const { width } = Dimensions.get('window');

const TITLES = [
  { min: 50, label: 'Pioneer',      icon: '🏔️' },
  { min: 35, label: 'Voyager',      icon: '⛵' },
  { min: 20, label: 'Cartographer', icon: '📜' },
  { min: 10, label: 'Explorer',     icon: '🌄' },
  { min: 5,  label: 'Pathfinder',   icon: '🗺️' },
  { min: 1,  label: 'Wanderer',     icon: '🧭' },
];

const getLevelTitle = (level) => TITLES.find((t) => level >= t.min) ?? TITLES[TITLES.length - 1];

const LevelUpModal = ({ visible, newLevel, onDismiss }) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 14, stiffness: 180 });
      opacity.value = withTiming(1, { duration: 220 });
      hapticHeavy();
      playLevelUp();
    } else {
      scale.value = 0.5;
      opacity.value = 0;
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible || !newLevel) return null;

  const { label, icon } = getLevelTitle(newLevel);

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, animStyle]}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.levelUp}>LEVEL UP</Text>
          <Text style={styles.levelNum}>{newLevel}</Text>
          <Text style={styles.title}>{label}</Text>
          <View style={styles.divider} />
          <Text style={styles.sub}>The world grows larger around you.</Text>
          <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width - 72,
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.waveComplete,
  },
  icon: { fontSize: 56, marginBottom: 10 },
  levelUp: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.waveComplete,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  levelNum: {
    fontSize: 72,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 80,
    fontVariant: ['tabular-nums'],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.waveComplete,
    marginTop: 2,
    marginBottom: 16,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    borderRadius: 1,
    marginBottom: 16,
  },
  sub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
  },
  btn: {
    width: '100%',
    backgroundColor: COLORS.waveComplete,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnText: {
    color: COLORS.background,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});

export default LevelUpModal;
