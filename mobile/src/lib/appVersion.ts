import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Bundled with Metro from app.json so Expo Go does not show a stale Constants snapshot.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bundled = require('../../app.json').expo as {
  version?: string;
  ios?: { buildNumber?: string };
  android?: { versionCode?: number; versionName?: string };
};

/**
 * Prefer app.json shipped with this JS bundle. Constants.expoConfig can lag in
 * Expo Go after version bumps until a full native restart.
 */
export function appVersion(): string {
  return bundled?.version || Constants.expoConfig?.version || Constants.nativeAppVersion || '0.0.0';
}

/** Store build: iOS buildNumber or Android versionCode. */
export function appBuild(): string {
  if (Platform.OS === 'ios') {
    return String(
      bundled?.ios?.buildNumber ||
        Constants.expoConfig?.ios?.buildNumber ||
        Constants.nativeBuildVersion ||
        '',
    );
  }
  if (Platform.OS === 'android') {
    const code = bundled?.android?.versionCode ?? Constants.expoConfig?.android?.versionCode;
    return code != null ? String(code) : String(Constants.nativeBuildVersion || '');
  }
  return String(bundled?.ios?.buildNumber || Constants.expoConfig?.ios?.buildNumber || '');
}

/** e.g. "Version 1.1.4 (14)" for Account / support. */
export function appVersionLabel(): string {
  const version = appVersion();
  const build = appBuild();
  return build ? `Version ${version} (${build})` : `Version ${version}`;
}
