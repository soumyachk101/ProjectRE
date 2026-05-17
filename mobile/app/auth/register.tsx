import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { colors, spacing, typography, radius } from '../../constants/theme';
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
      <View style={styles.inner}>
        <Text style={styles.logo}>🛣️ RoadSense</Text>
        <Text style={styles.title}>Let's get started</Text>
        <Text style={styles.sub}>Your phone number helps identify your trips</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>NAME (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 98765 43210"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={13}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          label="Send OTP →"
          onPress={handleContinue}
          loading={loading}
          style={{ marginTop: spacing.lg }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: {
    flex: 1, justifyContent: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  logo: { ...typography.display, color: colors.primary },
  title: { ...typography.h1, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.label, color: colors.textMuted, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 50,
  },
  error: { ...typography.caption, color: colors.danger },
});
