import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Marketing version from app.json (e.g. 1.1.4). */
export function appVersion(): string {
  return Constants.expoConfig?.version || '0.0.0';
}

/** Store build: iOS buildNumber or Android versionCode. */
export function appBuild(): string {
  if (Platform.OS === 'ios') {
    return String(Constants.expoConfig?.ios?.buildNumber || '');
  }
  if (Platform.OS === 'android') {
    const code = Constants.expoConfig?.android?.versionCode;
    return code != null ? String(code) : '';
  }
  return '';
}

/** e.g. "Version 1.1.4 (14)" for Account / support. */
export function appVersionLabel(): string {
  const version = appVersion();
  const build = appBuild();
  return build ? `Version ${version} (${build})` : `Version ${version}`;
}
