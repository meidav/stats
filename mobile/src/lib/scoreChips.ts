/** How many quick-score chips fit under one score field. */
export const SCORE_CHIP_MAX = 5;
export const SCORE_CHIP_MIN_WIDTH = 28;
export const SCORE_CHIP_GAP = 4;

const DOUBLES_VOLLEYBALL = new Set(['beach_volleyball_2s', 'vollis']);

export function isDoublesVolleyball(templateId?: string | null): boolean {
  return Boolean(templateId && DOUBLES_VOLLEYBALL.has(templateId));
}

export function chipCapacity(rowWidth: number): number {
  if (rowWidth <= 0) return 4;
  const fit = Math.floor((rowWidth + SCORE_CHIP_GAP) / (SCORE_CHIP_MIN_WIDTH + SCORE_CHIP_GAP));
  return Math.max(1, Math.min(SCORE_CHIP_MAX, fit));
}

/** Most common first. Ties keep the earlier value (pass newest games first). */
export function rankedScores(values: Array<number | null | undefined>, limit = 8): number[] {
  const counts = new Map<number, { n: number; first: number }>();
  values.forEach((value, index) => {
    if (value == null || !Number.isFinite(Number(value))) return;
    const score = Math.trunc(Number(value));
    const prev = counts.get(score);
    if (!prev) counts.set(score, { n: 1, first: index });
    else prev.n += 1;
  });
  return [...counts.entries()]
    .sort((a, b) => b[1].n - a[1].n || a[1].first - b[1].first)
    .slice(0, limit)
    .map(([score]) => score);
}

function uniqueScores(scores: number[]): number[] {
  const seen = new Set<number>();
  const next: number[] = [];
  for (const score of scores) {
    if (!Number.isFinite(score) || seen.has(score)) continue;
    seen.add(score);
    next.push(score);
  }
  return next;
}

/** Most common winner scores, left to right. Doubles volleyball always leads with 21. */
export function winnerScoreChips(
  ranked: number[],
  templateId: string | undefined,
  limit: number,
): number[] {
  const unique = uniqueScores(ranked);
  if (isDoublesVolleyball(templateId)) {
    return [21, ...unique.filter((score) => score !== 21)].slice(0, limit);
  }
  return unique.slice(0, limit);
}

/**
 * Most common loser scores, left to right.
 * Doubles volleyball: once the winner score is over 21, the left chip is that score minus 2.
 */
export function loserScoreChips(
  ranked: number[],
  templateId: string | undefined,
  winnerScoreText: string,
  limit: number,
): number[] {
  const unique = uniqueScores(ranked);
  if (isDoublesVolleyball(templateId)) {
    const entered = Number(winnerScoreText.trim());
    if (Number.isFinite(entered) && entered > 21) {
      const forced = entered - 2;
      if (forced >= 0) {
        return [forced, ...unique.filter((score) => score !== forced)].slice(0, limit);
      }
    }
  }
  return unique.slice(0, limit);
}
