import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { colors, spacing, typography, radius } from '../../constants/theme';
import { Button } from '../../components/ui/Button';

export default function Verify() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setTokens = useAuthStore((s) => s.setTokens);

  const handleVerify = async () => {
    if (otp.length !== 6) { setError('Enter 6-digit OTP'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.auth.login(phone!, otp);
      await setTokens(data.access_token, data.refresh_token);
      router.replace('/(tabs)/home');
    } catch {
      setError('Wrong OTP. Try 123456 in dev mode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.sub}>Sent to {phone}</Text>
      <Text style={styles.hint}>(Dev mode: use 123456)</Text>

      <TextInput
        style={styles.otpInput}
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="------"
        placeholderTextColor={colors.textMuted}
        textAlign="center"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button label="Verify →" onPress={handleVerify} loading={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl, justifyContent: 'center', gap: spacing.md,
  },
  title: { ...typography.h1, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textMuted },
  otpInput: {
    backgroundColor: colors.surface, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.primary,
    padding: spacing.lg, fontSize: 32, fontWeight: '700',
    color: colors.textPrimary, letterSpacing: 12, marginVertical: spacing.md,
  },
  error: { ...typography.caption, color: colors.danger },
});
