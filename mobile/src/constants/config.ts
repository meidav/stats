import { Platform } from 'react-native';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
};

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const PRODUCTION_API = 'https://www.playtracker.org/api/v1';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  extra.apiUrl ||
  (__DEV__ ? `http://${DEV_HOST}:5000/api/v1` : PRODUCTION_API);

export const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId || '';
export const GOOGLE_IOS_CLIENT_ID = extra.googleIosClientId || '';
export const GOOGLE_ANDROID_CLIENT_ID = extra.googleAndroidClientId || '';

export const googleSignInEnabled = Boolean(GOOGLE_WEB_CLIENT_ID);
