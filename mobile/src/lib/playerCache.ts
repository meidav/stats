import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'playtracker_players';

function uniqueNames(names: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export async function loadCachedPlayers(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? uniqueNames(JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function rememberPlayers(names: string[]) {
  const existing = await loadCachedPlayers();
  const next = uniqueNames([...existing, ...names]);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearCachedPlayers() {
  await AsyncStorage.removeItem(KEY);
}
