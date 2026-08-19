import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from './GlassCard';
import { IconActionRow } from './IconActionRow';
import { colors, spacing } from '../constants/theme';
import { formatGameStamp } from '../lib/datetime';
import type { Game } from '../types';

type Props = {
  games: Game[];
  canEdit: boolean;
  winLoss?: boolean;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
};

export function GameList({ games, canEdit, winLoss, onEdit, onDelete }: Props) {
  if (games.length === 0) {
    return <Text style={styles.empty}>No games logged yet.</Text>;
  }

  return (
    <View>
      {games.map((game) => (
        <GlassCard key={game.id} style={styles.card}>
          <View style={styles.top}>
            <Text style={styles.when}>{formatGameStamp(game.game_date)}</Text>
            {canEdit ? (
              <IconActionRow
                onEdit={() => onEdit(game)}
                onDelete={() => onDelete(game)}
                editLabel="Edit game"
                deleteLabel="Delete game"
              />
            ) : null}
          </View>

          <View style={[styles.team, styles.winner]}>
            <View style={styles.players}>
              {game.winners.map((name) => (
                <Text key={name} style={styles.player} numberOfLines={1}>
                  {name}
                </Text>
              ))}
            </View>
            <Text style={[styles.score, styles.winnerScore]}>
              {winLoss ? 'W' : game.winner_score}
            </Text>
          </View>

          <View style={[styles.team, styles.loser]}>
            <View style={styles.players}>
              {game.losers.map((name) => (
                <Text key={name} style={styles.playerLoser} numberOfLines={1}>
                  {name}
                </Text>
              ))}
            </View>
            <Text style={[styles.score, styles.loserScore]}>
              {winLoss ? 'L' : game.loser_score}
            </Text>
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  card: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    marginBottom: 4,
    paddingHorizontal: 14,
  },
  when: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(15, 23, 42, 0.55)',
    paddingRight: spacing.sm,
  },
  team: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
  },
  winner: {
    backgroundColor: 'rgba(5, 150, 105, 0.18)',
    borderLeftColor: colors.win,
  },
  loser: {
    backgroundColor: 'rgba(225, 29, 72, 0.14)',
    borderLeftColor: colors.loss,
  },
  players: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  player: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  playerLoser: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9F1239',
  },
  score: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
    minWidth: 40,
    textAlign: 'right',
  },
  winnerScore: {
    color: colors.win,
  },
  loserScore: {
    color: colors.loss,
  },
});
