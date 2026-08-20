import React from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

import { GlassCard } from './GlassCard';
import { colors, spacing } from '../constants/theme';
import { formatPlusMinus, winPctColor } from '../lib/names';
import type { PlayerStat } from '../types';

type Props = {
  title?: string;
  stats: PlayerStat[];
  showPlusMinus?: boolean;
  onPlayerPress: (player: string) => void;
};

function useTableLayout() {
  const { width } = useWindowDimensions();
  const compact = width < 640;
  return {
    headerSize: compact ? 10 : 12,
    cellSize: compact ? 13 : 15,
    rankWidth: compact ? 38 : 48,
    statWidth: compact ? 28 : 36,
    pctWidth: compact ? 26 : 34,
    trailingWidth: compact ? 34 : 44,
    rowPadH: compact ? 10 : 16,
    rowPadV: compact ? 8 : 10,
  };
}

export function StatsTable({ title, stats, showPlusMinus = true, onPlayerPress }: Props) {
  const layout = useTableLayout();
  if (stats.length === 0) return null;

  const rankStyle = [styles.rank, { width: layout.rankWidth }];
  const statStyle = [styles.stat, { width: layout.statWidth }];
  const pctStyle = [styles.stat, { width: layout.pctWidth }];
  const trailingStyle = [styles.stat, { width: layout.trailingWidth }];
  const rowPad = { paddingHorizontal: layout.rowPadH, paddingVertical: layout.rowPadV };
  const headerPad = { paddingHorizontal: layout.rowPadH };

  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <GlassCard style={styles.card}>
        <View style={[styles.headerRow, headerPad]}>
          <Text style={[styles.th, rankStyle, { fontSize: layout.headerSize }]}>#</Text>
          <Text style={[styles.th, styles.player, { fontSize: layout.headerSize }]}>Player</Text>
          <Text style={[styles.th, statStyle, { fontSize: layout.headerSize, color: colors.win }]}>W</Text>
          <Text style={[styles.th, statStyle, { fontSize: layout.headerSize, color: colors.loss }]}>L</Text>
          <Text style={[styles.th, pctStyle, { fontSize: layout.headerSize, color: colors.neutral }]}>%</Text>
          <Text style={[styles.th, trailingStyle, { fontSize: layout.headerSize, color: colors.neutral }]}>
            {showPlusMinus ? '+/-' : 'G'}
          </Text>
        </View>
        {stats.map((row, index) => (
          <View key={row.player} style={[styles.dataRow, rowPad, index % 2 === 1 && styles.altRow]}>
            <Text style={[styles.td, rankStyle, { fontSize: layout.cellSize }]}>{index + 1}</Text>
            <TouchableOpacity style={styles.player} onPress={() => onPlayerPress(row.player)}>
              <Text style={[styles.playerName, { fontSize: layout.cellSize }]}>{row.player}</Text>
            </TouchableOpacity>
            <Text style={[styles.td, statStyle, { fontSize: layout.cellSize, color: colors.win }]}>
              {row.wins}
            </Text>
            <Text style={[styles.td, statStyle, { fontSize: layout.cellSize, color: colors.loss }]}>
              {row.losses}
            </Text>
            <Text
              style={[
                styles.td,
                pctStyle,
                { fontSize: layout.cellSize, color: winPctColor(row.win_pct, colors) },
              ]}
            >
              {(row.win_pct * 100).toFixed(0)}
            </Text>
            {showPlusMinus ? (
              <Text
                style={[
                  styles.td,
                  trailingStyle,
                  {
                    fontSize: layout.cellSize,
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
              <Text
                style={[styles.td, trailingStyle, { fontSize: layout.cellSize, color: colors.neutral }]}
              >
                {row.games}
              </Text>
            )}
          </View>
        ))}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.text,
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
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.12)',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  altRow: {
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
  },
  th: {
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  td: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rank: {
    flexShrink: 0,
    color: colors.textMuted,
    textAlign: 'center',
  },
  player: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  playerName: {
    fontWeight: '700',
    color: colors.primary,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(37, 99, 235, 0.35)',
  },
  stat: {
    flexShrink: 0,
    textAlign: 'center',
  },
});
