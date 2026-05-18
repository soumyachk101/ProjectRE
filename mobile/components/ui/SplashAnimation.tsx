import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { colors, gradients, typography, spacing } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface SplashAnimationProps {
  onFinish: () => void;
}

export function SplashAnimation({ onFinish }: SplashAnimationProps) {
  const logoScale = useSharedValue(0.4);
  const logoOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(20);
  const subOpacity = useSharedValue(0);
  const orb1 = useSharedValue(0);
  const orb2 = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // Background orbs
    orb1.value = withRepeat(withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease) }), -1, true);
    orb2.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.ease) }), -1, true);

    // Logo entrance
    logoOpacity.value = withTiming(1, { duration: 500 });
    logoScale.value = withSpring(1, { damping: 9, stiffness: 110 });

    // Ring pulse
    ringOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    ringScale.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.35, { duration: 1100, easing: Easing.out(Easing.ease) }),
          withTiming(0.6, { duration: 0 })
        ),
        -1,
        false
      )
    );

    // Title
    titleOpacity.value = withDelay(550, withTiming(1, { duration: 450 }));
    titleTranslate.value = withDelay(550, withSpring(0, { damping: 14, stiffness: 90 }));
    subOpacity.value = withDelay(800, withTiming(1, { duration: 450 }));

    // Finish
    const timer = setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 380 }, (done) => {
        if (done) runOnJS(onFinish)();
      });
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value * (1 - (ringScale.value - 0.6) / 0.75),
    transform: [{ scale: ringScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value }));
  const orb1Style = useAnimatedStyle(() => ({
    opacity: 0.35 + orb1.value * 0.25,
    transform: [{ translateY: -30 + orb1.value * 60 }, { scale: 1 + orb1.value * 0.1 }],
  }));
  const orb2Style = useAnimatedStyle(() => ({
    opacity: 0.25 + orb2.value * 0.2,
    transform: [{ translateY: 30 - orb2.value * 60 }, { scale: 1 + orb2.value * 0.08 }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, containerStyle]}>
      <LinearGradient colors={gradients.splash as any} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.orb, styles.orb1, orb1Style]} />
      <Animated.View style={[styles.orb, styles.orb2, orb2Style]} />

      <View style={styles.center}>
        <View style={styles.logoBox}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View style={logoStyle}>
            <LinearGradient
              colors={gradients.accent as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              <MaterialCommunityIcons name="road-variant" size={56} color="#fff" />
            </LinearGradient>
          </Animated.View>
        </View>

        <Animated.Text style={[styles.title, titleStyle]}>RoadSense</Animated.Text>
        <Animated.Text style={[styles.subtitle, subStyle]}>Sensing every road, automatically</Animated.Text>
      </View>

      <Animated.View entering={FadeIn.delay(1000).duration(400)} style={styles.dotsRow}>
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </Animated.View>
    </Animated.View>
  );
}

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0.3, { duration: 500 })
        ),
        -1,
        false
      )
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 340,
    height: 340,
    backgroundColor: 'rgba(196, 83, 58, 0.10)',
    top: height * 0.06,
    left: -130,
  },
  orb2: {
    width: 380,
    height: 380,
    backgroundColor: 'rgba(47, 72, 88, 0.06)',
    bottom: height * 0.04,
    right: -160,
  },
  center: {
    alignItems: 'center',
    gap: spacing.md,
  },
  logoBox: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ring: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 1,
    borderColor: 'rgba(47, 72, 88, 0.30)',
  },
  logoCircle: {
    width: 104,
    height: 104,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1c1b18',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
  },
  title: {
    ...typography.display,
    color: '#1c1b18',
    fontSize: 42,
    letterSpacing: -1.3,
  },
  subtitle: {
    ...typography.body,
    color: '#5a564c',
    textAlign: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 70,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2f4858',
  },
});
