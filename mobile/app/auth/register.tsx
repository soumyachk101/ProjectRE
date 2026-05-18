import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { colors, gradients, spacing, typography, radius, shadows } from '../../constants/theme';
import { Button } from '../../components/ui/Button';

export default function Register() {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setUser = useAuthStore((s) => s.setUser);

  const handleContinue = async () => {
    if (!phone.trim() || phone.length < 10) {
      setError('Enter valid 10-digit phone');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: user } = await api.auth.register(phone.trim(), name.trim() || 'Rider');
      setUser(user);
      await api.auth.sendOtp(phone.trim());
      router.push({ pathname: '/auth/verify', params: { phone: phone.trim() } });
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Registration failed');
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
        <Animated.View entering={FadeInDown.duration(500)} style={styles.logoArea}>
          <LinearGradient
            colors={gradients.primaryBright as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoCircle}
          >
            <MaterialCommunityIcons name="road-variant" size={40} color="#fff" />
          </LinearGradient>
          <Text style={styles.logoText}>RoadSense</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={styles.title}>Let's get started</Text>
          <Text style={styles.sub}>A private road-sensing account for automatic trip detection.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>NAME</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="account-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Your name (optional)"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
            <View style={styles.inputWrap}>
              <MaterialCommunityIcons name="phone-outline" size={20} color={colors.textMuted} />
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="9876543210"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {error && (
            <View style={styles.errorRow}>
              <MaterialCommunityIcons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.error}>{error}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.buttonWrap}>
          <Button
            label="Continue"
            onPress={handleContinue}
            loading={loading}
            icon={<MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />}
          />
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  orbOne: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(47,72,88,0.08)',
    top: 60,
    right: -90,
  },
  orbTwo: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(47,72,88,0.08)',
    bottom: -90,
    left: -130,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  logoArea: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  logoText: {
    ...typography.h2,
    color: colors.primary,
    letterSpacing: 1,
  },
  title: { ...typography.display, color: colors.textPrimary, textAlign: 'center' },
  sub: { ...typography.body, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  fields: { gap: spacing.md },
  field: { gap: spacing.xs },
  fieldLabel: {
    ...typography.label,
    color: colors.textMuted,
    paddingLeft: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  countryCode: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  error: { ...typography.caption, color: colors.danger },
  buttonWrap: { marginTop: spacing.sm },
});
