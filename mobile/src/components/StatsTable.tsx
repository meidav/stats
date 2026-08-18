import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GlassCard } from './GlassCard';
import { colors, spacing } from '../constants/theme';
import { formatPlusMinus, winPctColor } from '../lib/names';
import type { PlayerStat } from '../types';

type Props = {
  title: string;
  stats: PlayerStat[];
  showPlusMinus?: boolean;
  onPlayerPress: (player: string) => void;
};

export function StatsTable({ title, stats, showPlusMinus = true, onPlayerPress }: Props) {
  if (stats.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <GlassCard style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={[styles.th, styles.rank]}>#</Text>
          <Text style={[styles.th, styles.player]}>Player</Text>
          <Text style={[styles.th, styles.stat, { color: colors.win }]}>W</Text>
          <Text style={[styles.th, styles.stat, { color: colors.loss }]}>L</Text>
          <Text style={[styles.th, styles.pct, { color: colors.neutral }]}>%</Text>
          {showPlusMinus ? (
            <Text style={[styles.th, styles.pm, { color: colors.neutral }]}>+/-</Text>
          ) : (
            <Text style={[styles.th, styles.pm, { color: colors.neutral }]}>G</Text>
          )}
        </View>
        {stats.map((row, index) => (
          <View key={row.player} style={[styles.dataRow, index % 2 === 1 && styles.altRow]}>
            <Text style={[styles.td, styles.rank]}>{index + 1}</Text>
            <TouchableOpacity style={styles.player} onPress={() => onPlayerPress(row.player)}>
              <Text style={styles.playerName} numberOfLines={1}>
                {row.player}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.td, styles.stat, { color: colors.win }]}>{row.wins}</Text>
            <Text style={[styles.td, styles.stat, { color: colors.loss }]}>{row.losses}</Text>
            <Text
              style={[
                styles.td,
                styles.pct,
                { color: winPctColor(row.win_pct, colors) },
              ]}
            >
              {(row.win_pct * 100).toFixed(0)}
            </Text>
            {showPlusMinus ? (
              <Text
                style={[
                  styles.td,
                  styles.pm,
                  {
                    color:
                      (row.plus_minus ?? 0) > 0
                        ? colors.win
                        : (row.plus_minus ?? 0) < 0
                          ? colors.loss
                          : colors.neutral,
                  },
                ]}
              >
                {formatPlusMinus(row.plus_minus ?? 0)}
              </Text>
            ) : (
              <Text style={[styles.td, styles.pm, { color: colors.neutral }]}>{row.games}</Text>
            )}
          </View>
        ))}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  card: {
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.12)',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  altRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  th: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  td: {
    fontSize: 15,
    fontWeight: '700',
  },
  rank: {
    width: 28,
    color: colors.textMuted,
  },
  player: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(37, 99, 235, 0.35)',
  },
  stat: {
    width: 28,
    textAlign: 'right',
  },
  pct: {
    width: 36,
    textAlign: 'right',
  },
  pm: {
    width: 40,
    textAlign: 'right',
  },
});
