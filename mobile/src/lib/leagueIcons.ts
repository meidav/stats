import type { League } from '../types';

export const LEAGUE_ICONS = [
  { id: 'trophy', kind: 'emoji', glyph: '🏆' },
  { id: 'medal', kind: 'emoji', glyph: '🏅' },
  { id: 'crown', kind: 'emoji', glyph: '👑' },
  { id: 'fire', kind: 'emoji', glyph: '🔥' },
  { id: 'star', kind: 'emoji', glyph: '⭐' },
  { id: 'lightning', kind: 'emoji', glyph: '⚡' },
  { id: 'beach_volleyball', kind: 'beach', glyph: '🏐' },
  { id: 'volleyball', kind: 'emoji', glyph: '🏐' },
  { id: 'tennis', kind: 'emoji', glyph: '🎾' },
  { id: 'basketball', kind: 'emoji', glyph: '🏀' },
  { id: 'soccer', kind: 'emoji', glyph: '⚽' },
  { id: 'chess', kind: 'emoji', glyph: '♚' },
  { id: 'checkers', kind: 'checker', glyph: '●' },
  { id: 'cards', kind: 'cards', glyph: '🃏' },
  { id: 'dice', kind: 'emoji', glyph: '🎲' },
  { id: 'target', kind: 'emoji', glyph: '🎯' },
  { id: 'game', kind: 'emoji', glyph: '🎮' },
  { id: 'puzzle', kind: 'emoji', glyph: '🧩' },
] as const;

export type LeagueIconId = (typeof LEAGUE_ICONS)[number]['id'];

export function glyphForIcon(icon?: string | null) {
  return LEAGUE_ICONS.find((item) => item.id === icon)?.glyph ?? null;
}

export function kindForIcon(icon?: string | null) {
  return LEAGUE_ICONS.find((item) => item.id === icon)?.kind ?? null;
}

export function glyphForLeague(league: Pick<League, 'icon' | 'sports'>) {
  return glyphForIcon(league.icon);
}
