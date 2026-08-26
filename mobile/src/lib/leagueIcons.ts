import type { League } from '../types';

export type LeagueIconFamily = 'sports' | 'games' | 'general';

export const LEAGUE_ICONS = [
  { id: 'beach_volleyball', kind: 'beach', glyph: '🏐', family: 'sports' },
  { id: 'volleyball', kind: 'emoji', glyph: '🏐', family: 'sports' },
  { id: 'tennis', kind: 'emoji', glyph: '🎾', family: 'sports' },
  { id: 'pickleball', kind: 'emoji', glyph: '🏓', family: 'sports' },
  { id: 'ping_pong', kind: 'emoji', glyph: '🏓', family: 'sports' },
  { id: 'badminton', kind: 'emoji', glyph: '🏸', family: 'sports' },
  { id: 'softball', kind: 'emoji', glyph: '🥎', family: 'sports' },
  { id: 'basketball', kind: 'emoji', glyph: '🏀', family: 'sports' },
  { id: 'soccer', kind: 'emoji', glyph: '⚽', family: 'sports' },
  { id: 'target', kind: 'emoji', glyph: '🎯', family: 'sports' },
  { id: 'cards', kind: 'cards', glyph: '🃏', family: 'games' },
  { id: 'dice', kind: 'emoji', glyph: '🎲', family: 'games' },
  { id: 'chess', kind: 'chess', glyph: '♞', family: 'games' },
  { id: 'checkers', kind: 'checker', glyph: '●', family: 'games' },
  { id: 'monopoly', kind: 'emoji', glyph: '🎩', family: 'games' },
  { id: 'scrabble', kind: 'scrabble', glyph: 'A', family: 'games' },
  { id: 'catan', kind: 'emoji', glyph: '🏕️', family: 'games' },
  { id: 'mahjong', kind: 'emoji', glyph: '🀄', family: 'games' },
  { id: 'game', kind: 'emoji', glyph: '🎮', family: 'games' },
  { id: 'puzzle', kind: 'emoji', glyph: '🧩', family: 'games' },
  { id: 'trophy', kind: 'emoji', glyph: '🏆', family: 'general' },
  { id: 'medal', kind: 'emoji', glyph: '🏅', family: 'general' },
  { id: 'crown', kind: 'emoji', glyph: '👑', family: 'general' },
  { id: 'star', kind: 'emoji', glyph: '⭐', family: 'general' },
  { id: 'fire', kind: 'emoji', glyph: '🔥', family: 'general' },
  { id: 'lightning', kind: 'emoji', glyph: '⚡', family: 'general' },
] as const;

export type LeagueIconId = (typeof LEAGUE_ICONS)[number]['id'];

export type LeagueIconUsage = {
  sports_leagues: number;
  games_leagues: number;
  icon_counts: Record<string, number>;
};

const FAMILY_RANK: Record<LeagueIconFamily, number> = {
  sports: 0,
  games: 1,
  general: 2,
};

export function sortLeagueIcons(usage?: LeagueIconUsage | null) {
  const sportsFirst = (usage?.sports_leagues ?? 0) >= (usage?.games_leagues ?? 0);
  const familyRank = sportsFirst
    ? FAMILY_RANK
    : { sports: 1, games: 0, general: 2 };
  const counts = usage?.icon_counts ?? {};

  return [...LEAGUE_ICONS].sort((a, b) => {
    const familyDiff = familyRank[a.family] - familyRank[b.family];
    if (familyDiff !== 0) return familyDiff;
    const countDiff = (counts[b.id] ?? 0) - (counts[a.id] ?? 0);
    if (countDiff !== 0) return countDiff;
    return 0;
  });
}

export function iconIdForSport(sport?: { template_id: string; category?: string } | null) {
  if (!sport) return null;
  const id = sport.template_id;
  if (id.startsWith('beach_volleyball') || id === 'vollis') return 'beach_volleyball';
  if (id === 'indoor_volleyball') return 'volleyball';
  if (id.startsWith('tennis')) return 'tennis';
  if (id.startsWith('pickleball')) return 'pickleball';
  if (id === 'ping_pong') return 'ping_pong';
  if (id.startsWith('badminton')) return 'badminton';
  if (id === 'softball') return 'softball';
  if (id.startsWith('basketball')) return 'basketball';
  if (id === 'chess') return 'chess';
  if (id === 'checkers') return 'checkers';
  if (id === 'monopoly') return 'monopoly';
  if (id === 'scrabble') return 'scrabble';
  if (id === 'catan') return 'catan';
  if (id === 'mahjong') return 'mahjong';
  if (id === 'backgammon' || id === 'yahtzee' || id === 'dominoes' || id === 'mancala') return 'dice';
  if (id === 'connect_four' || id === 'ticket_to_ride' || id === 'rummikub') return 'puzzle';
  if (sport.category === 'cards' || id === 'uno') return 'cards';
  if (sport.category === 'sports') return 'medal';
  if (sport.category === 'board') return 'puzzle';
  return null;
}

export function selectedIconForLeague(league: Pick<League, 'icon' | 'sports'>) {
  if (league.icon && LEAGUE_ICONS.some((item) => item.id === league.icon)) {
    return league.icon;
  }
  return iconIdForSport(league.sports?.[0] ?? null);
}

export function glyphForIcon(icon?: string | null) {
  return LEAGUE_ICONS.find((item) => item.id === icon)?.glyph ?? null;
}

export function kindForIcon(icon?: string | null) {
  return LEAGUE_ICONS.find((item) => item.id === icon)?.kind ?? null;
}

export function glyphForLeague(league: Pick<League, 'icon' | 'sports'>) {
  return glyphForIcon(league.icon);
}
