import AsyncStorage from '@react-native-async-storage/async-storage';

const INTRO_SEEN_KEY = 'playtracker_intro_seen_at';
const INTRO_TTL_MS = 3 * 60 * 60 * 1000;

export async function hasSeenIntroRecently(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(INTRO_SEEN_KEY);
  if (!raw) return false;
  const seenAt = Number(raw);
  if (!Number.isFinite(seenAt)) return false;
  return Date.now() - seenAt < INTRO_TTL_MS;
}

export async function markIntroSeen(): Promise<void> {
  await AsyncStorage.setItem(INTRO_SEEN_KEY, String(Date.now()));
}
