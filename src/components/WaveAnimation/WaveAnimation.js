import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const buildWavePath = (phase, amplitude, width, height, frequency, disturbed) => {
  'worklet';
  const points = [];
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const noise = disturbed ? Math.sin(i * 0.8 + phase * 3) * amplitude * 0.5 : 0;
    const y = height / 2 + Math.sin((i / steps) * Math.PI * 2 * frequency + phase) * amplitude + noise;
    points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  points.push(`L ${width} ${height} L 0 ${height} Z`);
  return points.join(' ');
};

const WaveLayer = ({ phase, amplitude, color, width, height, frequency, disturbed, opacity }) => {
  const animatedProps = useAnimatedProps(() => {
    const path = buildWavePath(phase.value, amplitude, width, height, frequency, disturbed.value);
    return { d: path };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      fill={color}
      fillOpacity={opacity}
    />
  );
};

const WaveAnimation = ({
  state = 'calm',
  progress = 0,
  width = 300,
  height = 120,
  style,
}) => {
  const phase1 = useSharedValue(0);
  const phase2 = useSharedValue(Math.PI / 3);
  const disturbed = useSharedValue(state === 'disturbed' ? 1 : 0);

  const isDisturbed = state === 'disturbed';
  const speed = isDisturbed ? 600 : state === 'complete' ? 2000 : 1200;

  useEffect(() => {
    disturbed.value = isDisturbed ? 1 : 0;
  }, [state]);

  useEffect(() => {
    phase1.value = 0;
    phase2.value = Math.PI / 3;
    phase1.value = withRepeat(
      withTiming(Math.PI * 2, { duration: speed, easing: Easing.linear }),
      -1,
      false,
    );
    phase2.value = withRepeat(
      withTiming(Math.PI * 2 + Math.PI / 3, { duration: speed * 1.3, easing: Easing.linear }),
      -1,
      false,
    );
  }, [speed]);

  const waveColor = state === 'disturbed'
    ? COLORS.waveDisturbed
    : state === 'complete'
    ? COLORS.waveComplete
    : interpolateColor(progress);

  const amplitude = isDisturbed ? 28 : 16;

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Svg width={width} height={height}>
        <WaveLayer
          phase={phase1}
          amplitude={amplitude}
          color={waveColor}
          width={width}
          height={height}
          frequency={1.5}
          disturbed={disturbed}
          opacity={0.4}
        />
        <WaveLayer
          phase={phase2}
          amplitude={amplitude * 0.7}
          color={waveColor}
          width={width}
          height={height}
          frequency={2}
          disturbed={disturbed}
          opacity={0.6}
        />
      </Svg>
    </View>
  );
};

const interpolateColor = (progress) => {
  if (progress < 0.5) return COLORS.waveActive;
  if (progress < 0.85) return COLORS.accent;
  return COLORS.waveComplete;
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default WaveAnimation;
