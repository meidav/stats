import type { League, SportTemplate } from '../types';

export type LeagueFocus = 'sports' | 'table' | 'mixed';

export const FOCUS_OPTIONS: Array<{ id: LeagueFocus; label: string; hint: string }> = [
  { id: 'sports', label: 'Sports', hint: 'Matches, standings, and seasons' },
  { id: 'table', label: 'Game night', hint: 'Cards, board games, family' },
  { id: 'mixed', label: 'Mix', hint: 'Sports and table games together' },
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
      homeTitle: 'My leagues',
      homeEmpty: 'Create your first league',
      createTitle: 'New league',
      firstGameLabel: 'First game',
      itemWord: 'game',
      itemWordPlural: 'games',
      addGameTitle: 'Add game',
      newAction: 'New league',
    };
  }
  if (focus === 'sports') {
    return {
      homeTitle: 'My leagues',
      homeEmpty: 'Create your first league',
      createTitle: 'New league',
      firstGameLabel: 'First sport',
      itemWord: 'sport',
      itemWordPlural: 'sports',
      addGameTitle: 'Add match',
      newAction: 'New league',
    };
  }
  return {
    homeTitle: 'My leagues',
    homeEmpty: 'Create your first league',
    createTitle: 'New league',
    firstGameLabel: 'First game',
    itemWord: 'game',
    itemWordPlural: 'games',
    addGameTitle: 'Add game',
    newAction: 'New league',
  };
}

const TEMPLATE_ALIASES: Record<string, string[]> = {
  beach_volleyball_2s: ['beach volleyball 2', "volleyball 2's", 'vb 2', 'doubles volleyball'],
  beach_volleyball_4s: ['beach volleyball 4', "volleyball 4's", 'vb 4', 'fours volleyball'],
  indoor_volleyball: ['indoor volleyball', 'indoor vb', 'gym volleyball'],
  vollis: ['vollis'],
  tennis_singles: ['tennis singles', 'singles tennis'],
  tennis_doubles: ['tennis doubles', 'doubles tennis'],
  basketball_3v3: ['basketball', '3v3', '3 on 3'],
  gin: ['gin rummy', 'gin'],
  pusoy_dos: ['pusoy dos', 'pusoy'],
  cribbage: ['crib', 'cribbage'],
  spades: ['spades'],
  hearts: ['hearts'],
  uno: ['uno'],
  chess: ['chess'],
  checkers: ['checkers', 'draughts'],
  backgammon: ['backgammon'],
  yahtzee: ['yahtzee'],
  scrabble: ['scrabble'],
  catan: ['catan', 'settlers'],
  monopoly: ['monopoly'],
};

function templateNeedles(template: SportTemplate) {
  const fromId = template.id.replace(/_/g, ' ');
  return [template.name, fromId, ...(TEMPLATE_ALIASES[template.id] || [])];
}

export function detectTemplateFromName(name: string, templates: SportTemplate[]): string | null {
  const hay = name.toLowerCase();
  if (!hay.trim()) return null;

  if (hay.includes('tennis')) {
    if (hay.includes('double')) return 'tennis_doubles';
    if (templates.some((t) => t.id === 'tennis_singles')) return 'tennis_singles';
  }
  if (hay.includes('volleyball') || /\bvb\b/.test(hay)) {
    if (hay.includes('indoor') || hay.includes('gym')) return 'indoor_volleyball';
    if (hay.includes('4')) return 'beach_volleyball_4s';
    if (templates.some((t) => t.id === 'beach_volleyball_2s')) return 'beach_volleyball_2s';
  }

  const ranked = [...templates].sort((a, b) => b.name.length - a.name.length);
  for (const template of ranked) {
    for (const needle of templateNeedles(template)) {
      const token = needle.trim().toLowerCase();
      if (token.length < 3) continue;
      if (hay.includes(token)) return template.id;
    }
  }
  return null;
}
