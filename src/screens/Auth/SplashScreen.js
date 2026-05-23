import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import WaveAnimation from '../../components/WaveAnimation';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.7);
  const subtitleOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
    logoScale.value = withDelay(300, withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) }));
    subtitleOpacity.value = withDelay(900, withTiming(1, { duration: 600 }));
    pulseScale.value = withDelay(1200, withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1,
      true,
    ));

    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.waveTop}>
        <WaveAnimation state="calm" width={width} height={180} progress={0.3} />
      </View>

      <View style={styles.center}>
        <Animated.View style={[styles.logoContainer, pulseStyle]}>
          <Animated.View style={logoStyle}>
            <Text style={styles.logoEmoji}>🌍</Text>
            <Text style={styles.logoText}>FocusWorld</Text>
          </Animated.View>
        </Animated.View>
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          Explore through focus
        </Animated.Text>
      </View>

      <View style={styles.waveBottom}>
        <WaveAnimation state="calm" width={width} height={180} progress={0.6} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
  },
  waveTop: {
    position: 'absolute',
    top: -60,
    left: 0,
    opacity: 0.3,
    transform: [{ rotate: '180deg' }],
  },
  waveBottom: {
    position: 'absolute',
    bottom: -60,
    left: 0,
    opacity: 0.3,
  },
  center: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 80,
    textAlign: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.accent,
    letterSpacing: 4,
    textTransform: 'uppercase',
    fontWeight: '300',
  },
});

export default SplashScreen;
