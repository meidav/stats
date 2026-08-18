import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AuthCard, authInputStyle } from '../components/AuthCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { GradientButton } from '../components/GradientButton';
import { colors, spacing } from '../constants/theme';
import { ApiError, api } from '../lib/api';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthCard subtitle="Check your email for a reset link or code.">
        <Text style={styles.message}>
          If an account exists for {email.trim()}, we sent password reset instructions.
        </Text>

        <GradientButton
          label="Enter reset code"
          onPress={() => navigation.navigate('ResetPassword', { email: email.trim() })}
        />

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.backLinkText}>Back to sign in</Text>
        </TouchableOpacity>
      </AuthCard>
    );
  }

  return (
    <AuthCard subtitle="We will email you a link to reset your password.">
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

      <ErrorBanner message={error} />

      <GradientButton
        label="Send reset link"
        onPress={handleSubmit}
        disabled={loading}
        loading={loading}
      />

      <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
        <Text style={styles.backLinkText}>Back to sign in</Text>
      </TouchableOpacity>
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  message: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
    opacity: 0.85,
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
