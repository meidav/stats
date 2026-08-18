import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ErrorBanner } from '../components/ErrorBanner';
import { GlassCard } from '../components/GlassCard';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { StatsTable } from '../components/StatsTable';
import { TemplateGlyph } from '../components/TemplateGlyph';
import { colors, gradients, spacing } from '../constants/theme';
import { copyForFocus } from '../lib/focus';
import { useAuth } from '../lib/auth';
import { ApiError, api } from '../lib/api';
import { upsertCachedLeague } from '../lib/leagueCache';
import { firstResultCopy } from '../lib/names';
import type { League, PlayerStat, Sport } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'League'>;

export function LeagueScreen({ route, navigation }: Props) {
  const { slug, name } = route.params;
  const { token } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [todayStats, setTodayStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const selectedIdRef = useRef<number | null>(null);

  const loadStats = useCallback(async (sport: Sport) => {
    const statsData = await api.getSportStats(sport.id, token, 1);
    setStats(statsData.stats);
    setTodayStats(statsData.today_stats ?? []);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function refresh() {
        setLoading(true);
        try {
          const leagueData = await api.getLeague(slug, token);
          if (!active) return;
          setLeague(leagueData);
          await upsertCachedLeague(leagueData);
          const sport =
            leagueData.sports.find((item) => item.id === selectedIdRef.current) ??
            leagueData.sports[0] ??
            null;
          selectedIdRef.current = sport?.id ?? null;
          setSelectedSport(sport);
          if (sport) {
            await loadStats(sport);
          } else {
            setStats([]);
            setTodayStats([]);
          }
          setError('');
        } catch (err) {
          if (active) {
            setError(err instanceof ApiError ? err.message : 'Could not load league');
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
    selectedIdRef.current = sport.id;
    setSelectedSport(sport);
    setLoading(true);
    try {
      await loadStats(sport);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load stats');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const leagueData = await api.getLeague(slug, token);
      setLeague(leagueData);
      await upsertCachedLeague(leagueData);
      const sport =
        leagueData.sports.find((item) => item.id === selectedIdRef.current) ??
        leagueData.sports[0] ??
        null;
      selectedIdRef.current = sport?.id ?? null;
      setSelectedSport(sport);
      if (sport) {
        await loadStats(sport);
      }
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load league');
    } finally {
      setRefreshing(false);
    }
  }

  const leagueName = league?.name || name;
  const copy = copyForFocus(league?.focus || 'mixed');
  const openAddGame = () => {
    if (!selectedSport) return;
    navigation.navigate('AddGame', {
      sportId: selectedSport.id,
      sportName: selectedSport.name,
      templateId: selectedSport.template_id,
      playersPerSide: selectedSport.players_per_side,
      scoreMode: selectedSport.score_mode,
      focus: league?.focus,
      leagueName,
    });
  };

  function openPlayer(playerName: string) {
    if (!selectedSport) return;
    navigation.navigate('PlayerProfile', {
      sportId: selectedSport.id,
      playerName,
      sportName: selectedSport.name,
      leagueName,
    });
  }

  return (
    <ScreenScaffold>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.topBarSpacer} />
        {selectedSport ? (
          <TouchableOpacity onPress={openAddGame} activeOpacity={0.85}>
            <LinearGradient
              colors={[...gradients.button]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.addButton}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addButtonText}>Game</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.topBarSpacer} />
        )}
      </View>

      <Text
        style={styles.leagueName}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.62}
      >
        {leagueName}
      </Text>
      {selectedSport ? (
        <View style={styles.sportMeta}>
          <TemplateGlyph
            template={{
              id: selectedSport.template_id,
              category: selectedSport.category || 'custom',
            }}
            size={18}
          />
          <Text style={styles.sportMetaText} numberOfLines={1}>
            {selectedSport.name}
          </Text>
        </View>
      ) : null}

      {league && league.sports.length > 1 ? (
        <View style={styles.sportTabs}>
          {league.sports.map((sport) => (
            <TouchableOpacity
              key={sport.id}
              style={[styles.tab, selectedSport?.id === sport.id && styles.tabActive]}
              onPress={() => selectSport(sport)}
            >
              <TemplateGlyph
                template={{ id: sport.template_id, category: sport.category || 'custom' }}
                size={16}
              />
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

      <ErrorBanner message={error} />

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={stats.length === 0 ? styles.emptyList : styles.list}
        >
          {stats.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              {selectedSport ? (
                <TemplateGlyph
                  template={{
                    id: selectedSport.template_id,
                    category: selectedSport.category || 'custom',
                  }}
                  size={36}
                />
              ) : null}
              <Text style={styles.emptyTitle}>No stats yet</Text>
              <Text style={styles.emptyBody}>
                {firstResultCopy(selectedSport?.name || 'game', selectedSport?.template_id)}
              </Text>
              {selectedSport ? (
                <TouchableOpacity onPress={openAddGame} activeOpacity={0.85}>
                  <LinearGradient
                    colors={[...gradients.button]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.emptyButton}
                  >
                    <Text style={styles.emptyButtonText}>{copy.addGameTitle}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}
            </GlassCard>
          ) : (
            <>
              <StatsTable
                title="Today's stats"
                stats={todayStats}
                onPlayerPress={openPlayer}
              />
              <StatsTable
                title="Standings"
                stats={stats}
                showPlusMinus={false}
                onPlayerPress={openPlayer}
              />
            </>
          )}
        </ScrollView>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  topBarSpacer: {
    flex: 1,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  leagueName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  sportMeta: {
    marginTop: 6,
    marginBottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.lg,
    maxWidth: '90%',
  },
  sportMetaText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 14,
    flexShrink: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  sportTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  emptyBody: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
