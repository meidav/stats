import { Platform } from 'react-native';

import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID, IS_EXPO_GO } from '../constants/config';

/**
 * Native sign-in wrappers. Both providers ship native modules that are absent from
 * Expo Go, so every module load is lazy and guarded: a missing module must degrade
 * to a hidden button, never a startup crash.
 */

export type AppleFullName = {
  givenName?: string | null;
  familyName?: string | null;
};

/** Thrown when the user dismisses the provider sheet. Callers should stay silent. */
export class SocialAuthCancelled extends Error {
  constructor() {
    super('Sign-in cancelled');
    this.name = 'SocialAuthCancelled';
  }
}

function loadModule<T>(load: () => T): T | null {
  if (IS_EXPO_GO) return null;
  try {
    return load();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- Google

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

let googleConfigured = false;

function loadGoogle(): GoogleModule | null {
  return loadModule(() => require('@react-native-google-signin/google-signin') as GoogleModule);
}

export function isGoogleSignInAvailable(): boolean {
  if (!GOOGLE_WEB_CLIENT_ID) return false;
  // On iOS the SDK needs its own client ID and the matching reversed URL scheme.
  if (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID) return false;
  return loadGoogle() !== null;
}

export async function signInWithGoogle(): Promise<string> {
  const google = loadGoogle();
  if (!google) {
    throw new Error('Google sign-in is not available in this build.');
  }

  const { GoogleSignin, statusCodes } = google;

  if (!googleConfigured) {
    GoogleSignin.configure({
      // The ID token is minted for the web client, which is what the server validates.
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      offlineAccess: false,
    });
    googleConfigured = true;
  }

  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    // Avoid silently reusing a stale account when the user explicitly tapped sign-in.
    await GoogleSignin.signOut().catch(() => undefined);

    const response = (await GoogleSignin.signIn()) as {
      type?: string;
      data?: { idToken?: string | null } | null;
      idToken?: string | null;
    };

    if (response?.type === 'cancelled') {
      throw new SocialAuthCancelled();
    }

    const idToken = response?.data?.idToken ?? response?.idToken ?? null;
    if (!idToken) {
      throw new Error('Google did not return a sign-in token.');
    }
    return idToken;
  } catch (error) {
    if (error instanceof SocialAuthCancelled) throw error;
    const code = (error as { code?: string })?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      throw new SocialAuthCancelled();
    }
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play services are required to sign in with Google.');
    }
    throw error instanceof Error ? error : new Error('Google sign-in failed.');
  }
}

// ----------------------------------------------------------------- Apple

type AppleModule = typeof import('expo-apple-authentication');

function loadApple(): AppleModule | null {
  if (Platform.OS !== 'ios') return null;
  return loadModule(() => require('expo-apple-authentication') as AppleModule);
}

/** Apple sign-in exists only on iOS 13+, so availability has to be asked at runtime. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  const apple = loadApple();
  if (!apple) return false;
  try {
    return await apple.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function signInWithApple(): Promise<{
  identityToken: string;
  fullName: AppleFullName | null;
}> {
  const apple = loadApple();
  if (!apple) {
    throw new Error('Apple sign-in is not available on this device.');
  }

  try {
    const credential = await apple.signInAsync({
      requestedScopes: [
        apple.AppleAuthenticationScope.FULL_NAME,
        apple.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple did not return a sign-in token.');
    }

    // Apple sends the name only on the first authorization for this app.
    const fullName = credential.fullName
      ? {
          givenName: credential.fullName.givenName ?? null,
          familyName: credential.fullName.familyName ?? null,
        }
      : null;

    return { identityToken: credential.identityToken, fullName };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') {
      throw new SocialAuthCancelled();
    }
    throw error instanceof Error ? error : new Error('Apple sign-in failed.');
  }
}
