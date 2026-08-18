import AsyncStorage from '@react-native-async-storage/async-storage';

// When false, intro is skipped after the user completes it once.
export const ALWAYS_SHOW_INTRO = true;

const ONBOARDING_KEY = 'playtracker_onboarding_done';

export async function hasCompletedOnboarding(): Promise<boolean> {
  if (ALWAYS_SHOW_INTRO) {
    return false;
  }
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === '1';
}

export async function completeOnboarding(): Promise<void> {
  if (ALWAYS_SHOW_INTRO) {
    return;
  }
  await AsyncStorage.setItem(ONBOARDING_KEY, '1');
}
