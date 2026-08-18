import AsyncStorage from '@react-native-async-storage/async-storage';

import type { League } from '../types';

const KEY = 'playtracker_leagues';

export async function loadCachedLeagues(): Promise<League[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as League[]) : [];
  } catch {
    return [];
  }
}

export async function saveCachedLeagues(leagues: League[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(leagues));
}

export async function upsertCachedLeague(league: League) {
  const existing = await loadCachedLeagues();
  const next = [league, ...existing.filter((item) => item.id !== league.id)];
  await saveCachedLeagues(next);
  return next;
}

export async function removeCachedLeague(id: number) {
  const existing = await loadCachedLeagues();
  const next = existing.filter((item) => item.id !== id);
  await saveCachedLeagues(next);
  return next;
}

export async function clearCachedLeagues() {
  await AsyncStorage.removeItem(KEY);
}
