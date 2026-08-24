import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AuthCard, authInputStyle } from '../components/AuthCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { GradientButton } from '../components/GradientButton';
import { PasswordField } from '../components/PasswordField';
import { SocialSignIn } from '../components/SocialSignIn';
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
  const [socialBusy, setSocialBusy] = useState(false);
  const [error, setError] = useState('');
  const submittingRef = useRef(false);
  const emailRef = useRef('');
  const passwordRef = useRef('');
  const autofillPendingRef = useRef(false);
  const autofillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const attemptLogin = useCallback(
    async (emailValue?: string, passwordValue?: string) => {
      if (submittingRef.current || loading) return;

      const nextEmail = (emailValue ?? emailRef.current).trim();
      const nextPassword = passwordValue ?? passwordRef.current;
      if (!nextEmail || !nextPassword) {
        setError('Enter your email and password.');
        return;
      }

      submittingRef.current = true;
      setLoading(true);
      setError('');
      Keyboard.dismiss();
      try {
        await login(nextEmail, nextPassword);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Login failed');
      } finally {
        submittingRef.current = false;
        setLoading(false);
      }
    },
    [loading, login],
  );

  const scheduleAutofillLogin = useCallback(
    (retry = 0) => {
      if (autofillTimerRef.current) {
        clearTimeout(autofillTimerRef.current);
      }

      autofillTimerRef.current = setTimeout(() => {
        autofillTimerRef.current = null;
        if (!autofillPendingRef.current) return;

        const nextEmail = emailRef.current.trim();
        const nextPassword = passwordRef.current;
        if (!nextEmail || !nextPassword) {
          if (retry < 5) {
            scheduleAutofillLogin(retry + 1);
          }
          return;
        }

        autofillPendingRef.current = false;
        attemptLogin(nextEmail, nextPassword);
      }, 100);
    },
    [attemptLogin],
  );

  const noteAutofillFill = useCallback(() => {
    autofillPendingRef.current = true;
    scheduleAutofillLogin();
  }, [scheduleAutofillLogin]);

  useEffect(() => {
    emailRef.current = email;
    passwordRef.current = password;
  }, [email, password]);

  useEffect(() => {
    return () => {
      if (autofillTimerRef.current) {
        clearTimeout(autofillTimerRef.current);
      }
    };
  }, []);

  function handleEmailChange(text: string) {
    const bulkFill =
      (email.length === 0 && text.includes('@')) ||
      text.length - email.length > 3;
    emailRef.current = text;
    setEmail(text);
    if (bulkFill) {
      noteAutofillFill();
    }
  }

  function handlePasswordChange(text: string) {
    const bulkFill =
      (password.length === 0 && text.length >= 4) ||
      text.length - password.length > 3;
    passwordRef.current = text;
    setPassword(text);
    if (bulkFill) {
      noteAutofillFill();
    }
  }

  useEffect(() => {
    if (!autofillPendingRef.current) return;
    if (email.trim() && password) {
      scheduleAutofillLogin();
    }
  }, [email, password, scheduleAutofillLogin]);

  const handleLogin = useCallback(() => {
    autofillPendingRef.current = false;
    attemptLogin();
  }, [attemptLogin]);

  return (
    <AuthCard
      footer={
        <TouchableOpacity onPress={() => navigation.navigate('Welcome')}>
          <Text style={styles.viewIntro}>View intro</Text>
        </TouchableOpacity>
      }
    >
      <SocialSignIn
        onError={setError}
        onBusyChange={setSocialBusy}
        disabled={loading}
      />

      <TextInput
        style={authInputStyle}
        placeholder="Email"
        placeholderTextColor={colors.onGlassMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="username"
        autoComplete="username"
        importantForAutofill="yes"
        value={email}
        onChangeText={handleEmailChange}
        onEndEditing={() => {
          if (autofillPendingRef.current && emailRef.current.trim() && passwordRef.current) {
            noteAutofillFill();
          }
        }}
        returnKeyType="next"
      />
      <PasswordField
        placeholder="Password"
        textContentType="password"
        autoComplete="password"
        importantForAutofill="yes"
        returnKeyType="go"
        value={password}
        onChangeText={handlePasswordChange}
        onSubmitEditing={handleLogin}
        onEndEditing={() => {
          if (autofillPendingRef.current && emailRef.current.trim() && passwordRef.current) {
            noteAutofillFill();
          }
        }}
      />

      <ErrorBanner message={error} />

      <GradientButton
        label="Sign In"
        onPress={handleLogin}
        disabled={loading || socialBusy}
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  footerLink: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  footerSep: {
    color: colors.onGlassMuted,
  },
  viewIntro: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
