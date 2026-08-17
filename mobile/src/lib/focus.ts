import type { League, SportTemplate } from '../types';

export type LeagueFocus = 'sports' | 'table' | 'mixed';

export const FOCUS_OPTIONS: Array<{ id: LeagueFocus; label: string; hint: string }> = [
  { id: 'sports', label: 'Sports', hint: 'Leagues, matches, standings' },
  { id: 'table', label: 'Game night', hint: 'Cards, board games, family' },
  { id: 'mixed', label: 'Mix', hint: 'A bit of everything' },
];

export function templatesForFocus(templates: SportTemplate[], focus: LeagueFocus) {
  if (focus === 'sports') {
    return templates.filter((t) => t.category === 'sports' || t.category === 'custom');
  }
  if (focus === 'table') {
    return templates.filter((t) => t.category === 'cards' || t.category === 'board' || t.category === 'custom');
  }
  return templates;
}

export function defaultTemplateId(templates: SportTemplate[], focus: LeagueFocus) {
  const visible = templatesForFocus(templates, focus);
  const preferred = focus === 'table' ? 'gin' : 'beach_volleyball_2s';
  if (visible.some((t) => t.id === preferred)) {
    return preferred;
  }
  return visible[0]?.id ?? 'custom';
}

export function focusFromLeagues(leagues: League[]): LeagueFocus {
  if (leagues.length === 0) {
    return 'mixed';
  }
  const focuses = leagues.map((league) => league.focus || 'mixed');
  const allSports = focuses.every((focus) => focus === 'sports');
  const allTable = focuses.every((focus) => focus === 'table');
  if (allSports) return 'sports';
  if (allTable) return 'table';
  return 'mixed';
}

export function copyForFocus(focus: LeagueFocus) {
  if (focus === 'table') {
    return {
      homeTitle: 'Game Nights',
      homeEmpty: 'No groups yet. Start one for family game night.',
      createTitle: 'New group',
      firstGameLabel: 'First game',
      itemWord: 'game',
      itemWordPlural: 'games',
      addGameTitle: 'Add game',
    };
  }
  if (focus === 'sports') {
    return {
      homeTitle: 'My Leagues',
      homeEmpty: 'No leagues yet. Create your first one.',
      createTitle: 'Create league',
      firstGameLabel: 'First sport',
      itemWord: 'sport',
      itemWordPlural: 'sports',
      addGameTitle: 'Add match',
    };
  }
  return {
    homeTitle: 'PlayTracker',
    homeEmpty: 'Nothing here yet. Create a league or game night.',
    createTitle: 'Create',
    firstGameLabel: 'First game',
    itemWord: 'game',
    itemWordPlural: 'games',
    addGameTitle: 'Add game',
  };
}
