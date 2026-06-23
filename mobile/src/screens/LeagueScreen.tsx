import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { colors, spacing } from '../constants/theme';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import type { League, PlayerStat, Sport } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'League'>;

export function LeagueScreen({ route, navigation }: Props) {
  const { slug, name } = route.params;
  const { token } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async (sport: Sport) => {
    const statsData = await api.getSportStats(sport.id, token, 1);
    setStats(statsData.stats);
  }, [token]);

  const loadLeague = useCallback(async () => {
    const leagueData = await api.getLeague(slug, token);
    setLeague(leagueData);
    const sport = selectedSport ?? leagueData.sports[0] ?? null;
    if (sport) {
      setSelectedSport(sport);
      await loadStats(sport);
    } else {
      setStats([]);
    }
  }, [slug, token, selectedSport, loadStats]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function refresh() {
        setLoading(true);
        try {
          const leagueData = await api.getLeague(slug, token);
          if (!active) return;
          setLeague(leagueData);
          const sport = selectedSport ?? leagueData.sports[0] ?? null;
          if (sport) {
            setSelectedSport(sport);
            await loadStats(sport);
          }
        } finally {
          if (active) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      }
      refresh();
      return () => {
        active = false;
      };
    }, [slug, token, loadStats]),
  );

  async function selectSport(sport: Sport) {
    setSelectedSport(sport);
    setLoading(true);
    await loadStats(sport);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadLeague();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{name}</Text>
        {selectedSport ? (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('AddGame', {
                sportId: selectedSport.id,
                sportName: selectedSport.name,
                playersPerSide: selectedSport.players_per_side,
              })
            }
          >
            <Text style={styles.add}>+ Game</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addPlaceholder} />
        )}
      </View>

      {league?.sports.length ? (
        <View style={styles.sportTabs}>
          {league.sports.map((sport) => (
            <TouchableOpacity
              key={sport.id}
              style={[styles.tab, selectedSport?.id === sport.id && styles.tabActive]}
              onPress={() => selectSport(sport)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedSport?.id === sport.id && styles.tabTextActive,
                ]}
              >
                {sport.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={stats}
          keyExtractor={(item) => item.player}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={stats.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No stats yet. Add your first game.</Text>
          }
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <Text style={styles.rank}>{index + 1}</Text>
              <View style={styles.playerBlock}>
                <Text style={styles.player}>{item.player}</Text>
                <Text style={styles.record}>
                  {item.wins}-{item.losses} · {(item.win_pct * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: {
    color: colors.primary,
    fontWeight: '600',
    width: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  add: {
    color: colors.primary,
    fontWeight: '700',
    width: 48,
    textAlign: 'right',
  },
  addPlaceholder: {
    width: 48,
  },
  sportTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#fff',
  },
  loader: {
    marginTop: spacing.xl,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rank: {
    width: 28,
    fontWeight: '700',
    color: colors.textMuted,
  },
  playerBlock: {
    flex: 1,
  },
  player: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  record: {
    color: colors.textMuted,
    marginTop: 2,
  },
});
