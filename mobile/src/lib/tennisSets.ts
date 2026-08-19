export type TennisFormat = 1 | 3 | 5;

export type TennisSetInput = { winner: string; loser: string };

export type TennisSetPair = [number, number];

export function isTennisTemplate(templateId?: string | null) {
  return Boolean(templateId && templateId.startsWith('tennis'));
}

export function blankSets(format: TennisFormat): TennisSetInput[] {
  return Array.from({ length: format }, () => ({ winner: '', loser: '' }));
}

export function formatFromSetCount(count: number): TennisFormat {
  if (count <= 1) return 1;
  if (count <= 3) return 3;
  return 5;
}

export function setsFromMetadata(
  metadata?: Record<string, unknown> | null,
  winnerScore?: number,
  loserScore?: number,
): { format: TennisFormat; sets: TennisSetInput[] } {
  const raw = metadata?.sets;
  if (Array.isArray(raw) && raw.length) {
    const pairs = raw
      .map((item) => {
        if (!Array.isArray(item) || item.length < 2) return null;
        const winner = Number(item[0]);
        const loser = Number(item[1]);
        if (Number.isNaN(winner) || Number.isNaN(loser)) return null;
        return { winner: String(winner), loser: String(loser) };
      })
      .filter((item): item is TennisSetInput => item != null);
    if (pairs.length) {
      const format = formatFromSetCount(pairs.length);
      return { format, sets: [...pairs, ...blankSets(format)].slice(0, format) };
    }
  }
  if (winnerScore != null && loserScore != null) {
    return { format: 1, sets: [{ winner: String(winnerScore), loser: String(loserScore) }] };
  }
  return { format: 1, sets: blankSets(1) };
}

export function completedSets(sets: TennisSetInput[]): TennisSetPair[] {
  const pairs: TennisSetPair[] = [];
  for (const set of sets) {
    if (!set.winner.trim() && !set.loser.trim()) continue;
    const winner = Number(set.winner);
    const loser = Number(set.loser);
    if (!Number.isInteger(winner) || !Number.isInteger(loser)) {
      throw new Error('Set scores must be whole numbers.');
    }
    if (winner < 0 || loser < 0 || winner > 20 || loser > 20) {
      throw new Error('Set scores must be between 0 and 20.');
    }
    if (winner === loser) {
      throw new Error('A set cannot be a tie.');
    }
    pairs.push([winner, loser]);
  }
  return pairs;
}

export function tennisScorePayload(sets: TennisSetInput[], format: TennisFormat) {
  const pairs = completedSets(sets);
  if (!pairs.length) {
    throw new Error('Enter at least one set.');
  }
  if (pairs.length > format) {
    throw new Error(`This format only allows ${format} set${format === 1 ? '' : 's'}.`);
  }
  const winnerSets = pairs.filter(([winner, loser]) => winner > loser).length;
  const loserSets = pairs.length - winnerSets;
  if (winnerSets <= loserSets) {
    throw new Error('Winner must take more sets than the loser.');
  }
  return {
    winner_score: pairs.reduce((sum, [winner]) => sum + winner, 0),
    loser_score: pairs.reduce((sum, [, loser]) => sum + loser, 0),
    metadata: {
      format,
      sets: pairs,
    },
  };
}

export function formatSetLine(metadata?: Record<string, unknown> | null) {
  const raw = metadata?.sets;
  if (!Array.isArray(raw) || !raw.length) return null;
  const parts = raw
    .map((item) => {
      if (!Array.isArray(item) || item.length < 2) return null;
      return `${item[0]}-${item[1]}`;
    })
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export const TENNIS_FORMATS: Array<{ id: TennisFormat; label: string }> = [
  { id: 1, label: '1 set' },
  { id: 3, label: 'Best of 3' },
  { id: 5, label: 'Best of 5' },
];
