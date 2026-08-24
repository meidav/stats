import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppleLogo, GoogleLogo } from './icons';
import { colors, gradients, spacing } from '../constants/theme';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  SocialAuthCancelled,
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
} from '../lib/socialAuth';

type Provider = 'google' | 'apple';

type Props = {
  onError: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
};

/**
 * Renders whichever native sign-in options this device actually supports.
 * Apple is iOS-only, so Android sees just the Google button, and the whole
 * block disappears when neither provider is configured.
 */
export function SocialSignIn({ onError, onBusyChange, disabled }: Props) {
  const { loginWithGoogle, loginWithApple } = useAuth();
  const [appleReady, setAppleReady] = useState(false);
  const [pending, setPending] = useState<Provider | null>(null);

  const googleReady = isGoogleSignInAvailable();

  useEffect(() => {
    let active = true;
    isAppleSignInAvailable().then((available) => {
      if (active) setAppleReady(available);
    });
    return () => {
      active = false;
    };
  }, []);

  const run = useCallback(
    async (provider: Provider, action: () => Promise<void>) => {
      if (pending) return;
      setPending(provider);
      onBusyChange?.(true);
      onError('');
      try {
        await action();
      } catch (err) {
        if (err instanceof SocialAuthCancelled) return;
        if (err instanceof ApiError) {
          onError(err.message);
        } else {
          onError(err instanceof Error ? err.message : 'Sign-in failed. Try again.');
        }
      } finally {
        setPending(null);
        onBusyChange?.(false);
      }
    },
    [onBusyChange, onError, pending],
  );

  const handleApple = useCallback(
    () =>
      run('apple', async () => {
        const { identityToken, fullName } = await signInWithApple();
        await loginWithApple(identityToken, fullName);
      }),
    [loginWithApple, run],
  );

  const handleGoogle = useCallback(
    () =>
      run('google', async () => {
        const idToken = await signInWithGoogle();
        await loginWithGoogle(idToken);
      }),
    [loginWithGoogle, run],
  );

  if (!appleReady && !googleReady) return null;

  const blocked = disabled || pending !== null;

  return (
    <View>
      {appleReady ? (
        <TouchableOpacity
          style={[styles.socialButton, styles.appleButton, blocked && styles.blocked]}
          onPress={handleApple}
          disabled={blocked}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Apple"
        >
          {pending === 'apple' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <AppleLogo />
              <Text style={styles.appleButtonText}>Sign in with Apple</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      {googleReady ? (
        <TouchableOpacity
          style={[styles.socialButton, blocked && styles.blocked]}
          onPress={handleGoogle}
          disabled={blocked}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google"
        >
          <LinearGradient
            colors={[...gradients.button]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.googleGradient}
          >
            {pending === 'google' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <GoogleLogo />
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or sign in with email</Text>
        <View style={styles.dividerLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  socialButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  blocked: {
    opacity: 0.6,
  },
  appleButton: {
    backgroundColor: '#000',
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  googleGradient: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
  },
  googleButtonText: {
    color: '#fff',
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
    backgroundColor: 'rgba(255, 247, 237, 0.35)',
  },
  dividerText: {
    color: colors.onGlassMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
