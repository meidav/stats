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
  const index = existing.findIndex((item) => item.id === league.id);
  // Keep list order stable. Viewing/editing a league must not bump it to the top.
  const next =
    index >= 0
      ? existing.map((item, i) => (i === index ? { ...item, ...league } : item))
      : [...existing, league];
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
