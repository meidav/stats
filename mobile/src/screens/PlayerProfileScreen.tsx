import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ErrorBanner } from '../components/ErrorBanner';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { colors, spacing } from '../constants/theme';
import { formatPlusMinus, initials, winPctColor } from '../lib/names';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { PlayerProfile, PlayerStat } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerProfile'>;

export function PlayerProfileScreen({ route, navigation }: Props) {
  const { sportId, playerName, sportName, leagueName } = route.params;
  const { token } = useAuth();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        setLoading(true);
        try {
          const data = await api.getPlayerStats(sportId, playerName, token);
          if (active) {
            setProfile(data);
            setError('');
          }
        } catch (err) {
          if (active) {
            setError(err instanceof ApiError ? err.message : 'Could not load player');
          }
        } finally {
          if (active) setLoading(false);
        }
      }
      load();
      return () => {
        active = false;
      };
    }, [sportId, playerName, token]),
  );

  const streakColor = profile?.streak.endsWith('W')
    ? colors.win
    : profile?.streak.endsWith('L')
      ? colors.loss
      : colors.neutral;

  function openPlayer(name: string) {
    navigation.push('PlayerProfile', {
      sportId,
      playerName: name,
      sportName,
      leagueName,
    });
  }

  return (
    <ScreenScaffold>
      <ScreenHeader title={playerName} onBack={() => navigation.goBack()} />
      <ErrorBanner message={error} />
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : profile ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(profile.player)}</Text>
            </View>
            <View style={styles.heroText}>
              <Text style={styles.name}>{profile.player}</Text>
              <Text style={styles.subtitle}>
                {leagueName} · {sportName}
              </Text>
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <Kpi value={String(profile.wins)} label="Wins" color={colors.win} />
            <Kpi value={String(profile.losses)} label="Losses" color={colors.loss} />
            <Kpi
              value={`${(profile.win_pct * 100).toFixed(0)}%`}
              label="Win %"
              color={winPctColor(profile.win_pct, colors)}
            />
            <Kpi value={String(profile.games)} label="Games" color={colors.neutral} />
            <Kpi
              value={formatPlusMinus(profile.plus_minus)}
              label="+/-"
              color={
                profile.plus_minus > 0
                  ? colors.win
                  : profile.plus_minus < 0
                    ? colors.loss
                    : colors.neutral
              }
            />
            <Kpi
              value={profile.streak}
              label={profile.rank ? `Streak · #${profile.rank} of ${profile.field_size}` : 'Streak'}
              color={streakColor}
            />
          </View>

          {profile.last_results.length ? (
            <View style={styles.streakBlock}>
              <Text style={styles.sectionTitle}>Last {profile.last_results.length} games</Text>
              <View style={styles.dots}>
                {profile.last_results.map((result, index) => (
                  <View
                    key={`${result}-${index}`}
                    style={[
                      styles.dot,
                      { backgroundColor: result === 'W' ? colors.win : colors.loss },
                    ]}
                  >
                    <Text style={styles.dotText}>{result}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <PairTable
            title={`Stats with partners (${profile.partners.length})`}
            tone="win"
            rows={profile.partners}
            onPress={openPlayer}
          />
          <PairTable
            title={`Stats vs opponents (${profile.opponents.length})`}
            tone="loss"
            rows={profile.opponents}
            onPress={openPlayer}
          />
        </ScrollView>
      ) : null}
    </ScreenScaffold>
  );
}

function Kpi({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <GlassCard style={styles.kpi}>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </GlassCard>
  );
}

function PairTable({
  title,
  tone,
  rows,
  onPress,
}: {
  title: string;
  tone: 'win' | 'loss';
  rows: PlayerStat[];
  onPress: (name: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.pairWrap}>
      <Text style={[styles.sectionTitle, { color: tone === 'win' ? colors.win : colors.loss }]}>
        {title}
      </Text>
      <GlassCard style={styles.pairCard}>
        <View style={styles.pairHeader}>
          <Text style={[styles.pairTh, styles.pairPlayer]}>Player</Text>
          <Text style={[styles.pairTh, { color: colors.neutral }]}>%</Text>
          <Text style={[styles.pairTh, { color: colors.win }]}>W</Text>
          <Text style={[styles.pairTh, { color: colors.loss }]}>L</Text>
          <Text style={[styles.pairTh, { color: colors.neutral }]}>G</Text>
        </View>
        {rows.map((row, index) => (
          <TouchableOpacity
            key={row.player}
            style={[styles.pairRow, index % 2 === 1 && styles.pairAlt]}
            onPress={() => onPress(row.player)}
          >
            <Text style={[styles.pairPlayer, styles.pairName]} numberOfLines={1}>
              {row.player}
            </Text>
            <Text style={[styles.pairTd, { color: winPctColor(row.win_pct, colors) }]}>
              {(row.win_pct * 100).toFixed(0)}
            </Text>
            <Text style={[styles.pairTd, { color: colors.win }]}>{row.wins}</Text>
            <Text style={[styles.pairTd, { color: colors.loss }]}>{row.losses}</Text>
            <Text style={[styles.pairTd, { color: colors.neutral }]}>{row.games}</Text>
          </TouchableOpacity>
        ))}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: spacing.xl,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  heroText: {
    flex: 1,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 14,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  kpi: {
    width: '31%',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  kpiLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  streakBlock: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  pairWrap: {
    marginBottom: spacing.lg,
  },
  pairCard: {
    overflow: 'hidden',
    paddingVertical: spacing.sm,
  },
  pairHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  pairAlt: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  pairTh: {
    width: 32,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '800',
  },
  pairTd: {
    width: 32,
    textAlign: 'right',
    fontWeight: '700',
  },
  pairPlayer: {
    flex: 1,
  },
  pairName: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(37, 99, 235, 0.35)',
  },
});
