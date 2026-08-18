import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AuthCard, authInputStyle } from '../components/AuthCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { GradientButton } from '../components/GradientButton';
import { PasswordField } from '../components/PasswordField';
import { AppleLogo, GoogleLogo } from '../components/icons';
import { colors, spacing } from '../constants/theme';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <TouchableOpacity style={[styles.socialButton, styles.appleButton]} disabled>
        <AppleLogo />
        <Text style={styles.appleButtonText}>Sign in with Apple</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.socialButton, styles.googleButton]} disabled>
        <GoogleLogo />
        <Text style={styles.googleButtonText}>Sign in with Google</Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or sign in with email</Text>
        <View style={styles.dividerLine} />
      </View>

      <TextInput
        style={authInputStyle}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <PasswordField
        placeholder="Password"
        textContentType="password"
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
      />

      <ErrorBanner message={error} />

      <GradientButton
        label="Sign In"
        onPress={handleLogin}
        disabled={loading}
        loading={loading}
      />

      <View style={styles.footerRow}>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.footerLink}>Forgot password?</Text>
        </TouchableOpacity>
        <Text style={styles.footerSep}>|</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.footerLink}>Create account</Text>
        </TouchableOpacity>
      </View>
    </AuthCard>
  );
}

const styles = StyleSheet.create({
  socialButton: {
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
    opacity: 0.72,
  },
  appleButton: {
    backgroundColor: '#111827',
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.12)',
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  footerSep: {
    color: colors.textMuted,
  },
});
