import type { SportTemplate } from '../types';

export function iconForTemplate(template: Pick<SportTemplate, 'id' | 'category'>): string {
  const id = template.id;

  if (id.startsWith('beach_volleyball')) return '🏐';
  if (id === 'indoor_volleyball' || id === 'vollis') return '🏐';
  if (id.startsWith('tennis')) return '🎾';
  if (id.startsWith('pickleball')) return '🏓';
  if (id === 'ping_pong') return '🏓';
  if (id.startsWith('badminton')) return '🏸';
  if (id === 'softball') return '🥎';
  if (id.startsWith('basketball')) return '🏀';
  if (id === 'chess') return '♞';
  if (id === 'checkers') return '●';
  if (id === 'monopoly') return '🎩';
  if (id === 'backgammon' || id === 'yahtzee') return '🎲';
  if (id === 'dominoes' || id === 'mancala') return '🎲';
  if (id === 'scrabble') return 'A';
  if (id === 'catan') return '🏕️';
  if (id === 'mahjong') return '🀄';
  if (id === 'rummikub' || id === 'connect_four' || id === 'ticket_to_ride') return '🧩';
  if (id === 'custom') return '+';

  if (template.category === 'cards' || id === 'uno') return '🃏';
  if (template.category === 'board') return '🧩';
  if (template.category === 'sports') return '🏅';
  return '🎮';
}
