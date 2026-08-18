import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AuthCard, authInputStyle } from '../components/AuthCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { GradientButton } from '../components/GradientButton';
import { PasswordField } from '../components/PasswordField';
import { colors, spacing } from '../constants/theme';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignUp() {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await register(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard subtitle="Create your account to start tracking.">
      <TextInput
        style={authInputStyle}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <PasswordField
        placeholder="Password"
        textContentType="newPassword"
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
      />
      <PasswordField
        placeholder="Confirm password"
        textContentType="newPassword"
        autoComplete="new-password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Text style={styles.hint}>Use at least 8 characters.</Text>

      <ErrorBanner message={error} />

      <GradientButton
        label="Create account"
        onPress={handleSignUp}
        disabled={loading}
        loading={loading}
      />

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.footerLink}>Sign in</Text>
        </TouchableOpacity>
      </View>
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
