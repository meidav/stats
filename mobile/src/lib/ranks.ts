import type { PlayerStat } from '../types';

type RankRow = Pick<PlayerStat, 'win_pct' | 'wins' | 'games' | 'plus_minus'>;

function standingsRankKey(row: RankRow): string {
  return `${row.win_pct}|${row.wins}`;
}

function pairRankKey(row: RankRow): string {
  return `${row.win_pct}|${row.wins}|${row.games}`;
}

export function competitionRanks(rows: RankRow[], mode: 'standings' | 'pair' = 'standings'): number[] {
  if (rows.length === 0) return [];
  const keyFn = mode === 'pair' ? pairRankKey : standingsRankKey;
  const ranks: number[] = [];
  let currentRank = 1;
  rows.forEach((row, index) => {
    if (index > 0 && keyFn(row) !== keyFn(rows[index - 1])) {
      currentRank = index + 1;
    }
    ranks.push(currentRank);
  });
  return ranks;
}
