import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { colors, gradients, spacing, typography, radius, shadows } from '../../constants/theme';
import { Button } from '../../components/ui/Button';

const OTP_LENGTH = 6;

export default function Verify() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setTokens = useAuthStore((s) => s.setTokens);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Paste support
      const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpStr = otp.join('');
    if (otpStr.length !== OTP_LENGTH) { setError('Enter 6-digit OTP'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.auth.login(phone!, otpStr);
      await setTokens(data.access_token, data.refresh_token);
      router.replace('/(tabs)/home');
    } catch {
      setError('Wrong OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={gradients.aurora as any} style={StyleSheet.absoluteFill} />
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <View style={styles.inner}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.iconArea}>
          <LinearGradient
            colors={gradients.accent as any}
            style={styles.iconCircle}
          >
            <MaterialCommunityIcons name="shield-lock-outline" size={40} color="#fff" />
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={styles.title}>Verification</Text>
          <Text style={styles.sub}>Enter the secure 6-digit code sent to</Text>
          <Text style={styles.phone}>+91 {phone}</Text>
        </Animated.View>

        {/* OTP boxes */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.otpRow}>
          {otp.map((digit, i) => (
            <View
              key={i}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
                error ? styles.otpBoxError : null,
              ]}
            >
              <TextInput
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={styles.otpInput}
                value={digit}
                onChangeText={(t) => handleOtpChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            </View>
          ))}
        </Animated.View>

        {error && (
          <View style={styles.errorRow}>
            <MaterialCommunityIcons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.error}>{error}</Text>
          </View>
        )}

        {__DEV__ && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text style={styles.hint}>
              <MaterialCommunityIcons name="information-outline" size={14} color={colors.textMuted} />
              {' '}Dev mode: use 123456
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.buttonWrap}>
          <Button label="Verify" onPress={handleVerify} loading={loading} />
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  orbOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(47,72,88,0.08)',
    top: 70,
    right: -90,
  },
  orbTwo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(47,72,88,0.08)',
    bottom: -80,
    left: -120,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconArea: { marginBottom: spacing.sm },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  title: { ...typography.display, color: colors.textPrimary, textAlign: 'center' },
  sub: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  phone: { ...typography.h3, color: colors.accent, textAlign: 'center', marginTop: spacing.xs },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.sm,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.glass,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  otpBoxFilled: {
    borderColor: colors.accent,
    backgroundColor: colors.primaryGlow,
  },
  otpBoxError: {
    borderColor: colors.danger,
  },
  otpInput: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  error: { ...typography.caption, color: colors.danger },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  buttonWrap: { width: '100%', marginTop: spacing.sm },
});
