import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';

import { AuthCard, authInputStyle } from '../components/AuthCard';
import { GradientButton } from '../components/GradientButton';
import { PasswordField } from '../components/PasswordField';
import { colors, spacing } from '../constants/theme';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { resetPassword } = useAuth();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await resetPassword(token.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      subtitle={
        route.params?.email
          ? `Enter the reset code sent to ${route.params.email}.`
          : 'Paste the reset code from your email.'
      }
    >
      <TextInput
        style={authInputStyle}
        placeholder="Reset code"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        value={token}
        onChangeText={setToken}
      />
      <PasswordField
        placeholder="New password"
        textContentType="newPassword"
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
      />
      <PasswordField
        placeholder="Confirm new password"
        textContentType="newPassword"
        autoComplete="new-password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Text style={styles.hint}>Use at least 8 characters.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <GradientButton
        label="Update password"
        onPress={handleReset}
        disabled={loading}
        loading={loading}
      />

      <TouchableOpacity style={styles.backLink} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.backLinkText}>Back to sign in</Text>
      </TouchableOpacity>
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  backLink: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  backLinkText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
