import 'react-native-gesture-handler';

import { registerRootComponent } from 'expo';
import { Alert } from 'react-native';

import App from './App';

// Surface JS errors as a readable alert instead of an instant native abort.
const errorUtils = (
  globalThis as {
    ErrorUtils?: {
      setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
    };
  }
).ErrorUtils;

errorUtils?.setGlobalHandler?.((error, isFatal) => {
  const message = error?.message || String(error);
  const stack = error?.stack || '';
  console.error('PlayTracker fatal:', message, stack);
  try {
    Alert.alert(
      isFatal ? 'PlayTracker crashed' : 'PlayTracker error',
      `${message}\n\n${stack}`.slice(0, 1200),
    );
  } catch {
    // Alert is unavailable this early in startup.
  }
});

registerRootComponent(App);
