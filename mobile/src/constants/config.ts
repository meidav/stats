import { Platform } from 'react-native';

// iOS simulator can reach host machine via localhost.
// Android emulator uses 10.0.2.2 for the host loopback.
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL = __DEV__
  ? `http://${DEV_HOST}:5000/api/v1`
  : 'https://playtracker.org/api/v1';
