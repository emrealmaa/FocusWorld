import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { formatTime } from '../../utils/timeUtils';

const SIZE = 260;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const phaseColors = {
  idle: COLORS.waveActive,
  work: COLORS.waveActive,
  break: COLORS.success,
  complete: COLORS.waveComplete,
};

const phaseLabels = {
  idle: 'READY',
  work: 'FOCUS',
  break: 'BREAK',
};

const PomodoroTimer = ({ timeLeft, totalDuration, phase, progress, disturbanceCount }) => {
  const pulse = useSharedValue(1);
  const prevTimeLeft = React.useRef(timeLeft);

  // Pulse on each tick
  useEffect(() => {
    if (timeLeft !== prevTimeLeft.current && phase === 'work') {
      pulse.value = withSequence(
        withTiming(1.03, { duration: 80, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 220, easing: Easing.in(Easing.ease) }),
      );
    }
    prevTimeLeft.current = timeLeft;
  }, [timeLeft]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const ringColor = phaseColors[phase] ?? COLORS.waveActive;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const label = phaseLabels[phase] ?? 'READY';

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, containerStyle]}>
        <Svg width={SIZE} height={SIZE}>
          {/* Background ring */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={COLORS.surfaceLight}
            strokeWidth={STROKE}
            fill="transparent"
          />
          {/* Progress ring */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={ringColor}
            strokeWidth={STROKE}
            fill="transparent"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.center}>
          <Text style={[styles.timeText, { color: ringColor }]}>
            {formatTime(timeLeft)}
          </Text>
          <Text style={styles.phaseLabel}>{label}</Text>
          {disturbanceCount > 0 && phase === 'work' && (
            <Text style={styles.disturbance}>⚡ {disturbanceCount} interruption{disturbanceCount > 1 ? 's' : ''}</Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  phaseLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  disturbance: {
    fontSize: 11,
    color: COLORS.waveDisturbed,
    marginTop: 6,
    fontWeight: '600',
  },
});

export default PomodoroTimer;
