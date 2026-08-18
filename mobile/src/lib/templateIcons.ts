import type { SportTemplate } from '../types';

export function iconForTemplate(template: Pick<SportTemplate, 'id' | 'category'>): string {
  const id = template.id;

  if (id.startsWith('beach_volleyball') || id === 'vollis') return '🏐';
  if (id.startsWith('tennis')) return '🎾';
  if (id.startsWith('basketball')) return '🏀';
  if (id === 'chess' || id === 'checkers') return '♟️';
  if (id === 'backgammon' || id === 'yahtzee') return '🎲';
  if (id === 'scrabble') return '🔤';
  if (id === 'catan') return '🏕️';
  if (id === 'custom') return '✨';

  if (template.category === 'cards' || id === 'uno') return '🃏';
  if (template.category === 'board') return '🧩';
  if (template.category === 'sports') return '🏅';
  return '🎮';
}
