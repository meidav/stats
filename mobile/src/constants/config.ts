import Constants, { ExecutionEnvironment } from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
};

const PRODUCTION_API = 'https://www.playtracker.org/api/v1';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  extra.apiUrl ||
  PRODUCTION_API;

export const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId || '';
export const GOOGLE_IOS_CLIENT_ID = extra.googleIosClientId || '';
export const GOOGLE_ANDROID_CLIENT_ID = extra.googleAndroidClientId || '';

export const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const googleSignInEnabled = Boolean(GOOGLE_WEB_CLIENT_ID) && !IS_EXPO_GO;

export const EXPO_AUTH_REDIRECT_URI = 'https://auth.expo.io/@stacktracker/playtracker';
