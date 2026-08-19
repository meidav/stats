import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ErrorBanner } from '../components/ErrorBanner';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { GameList } from '../components/GameList';
import { GlassCard } from '../components/GlassCard';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { StatsTable } from '../components/StatsTable';
import { TemplateGlyph } from '../components/TemplateGlyph';
import { colors, gradients, spacing } from '../constants/theme';
import { copyForFocus } from '../lib/focus';
import { localToday } from '../lib/datetime';
import { useAuth } from '../lib/auth';
import { ApiError, api } from '../lib/api';
import { upsertCachedLeague } from '../lib/leagueCache';
import { shareLeague } from '../lib/leagueLinks';
import { firstResultCopy } from '../lib/names';
import type { Game, League, PlayerStat, Sport } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'League'>;

export function LeagueScreen({ route, navigation }: Props) {
  const { slug, name, role: routeRole } = route.params;
  const { token } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [todayStats, setTodayStats] = useState<PlayerStat[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deleteGame, setDeleteGame] = useState<Game | null>(null);
  const [deleting, setDeleting] = useState(false);
  const selectedIdRef = useRef<number | null>(null);

  const loadStats = useCallback(async (sport: Sport) => {
    const [statsData, gamesData] = await Promise.all([
      api.getSportStats(sport.id, token, 1, localToday()),
      api.getSportGames(sport.id, token),
    ]);
    setStats(statsData.stats);
    setTodayStats(statsData.today_stats ?? []);
    setGames(gamesData.games ?? []);
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
            setGames([]);
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
      } else {
        setStats([]);
        setTodayStats([]);
        setGames([]);
      }
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load league');
    } finally {
      setRefreshing(false);
    }
  }

  const leagueName = league?.name || name || '';
  const copy = copyForFocus(league?.focus || 'mixed');
  const canEdit =
    league?.role === 'owner' ||
    league?.role === 'admin' ||
    routeRole === 'owner' ||
    routeRole === 'admin';
  const isMember = Boolean(league?.role || routeRole);
  const canShare = Boolean(
    league && (league.share_url || league.visibility !== 'private' || league.invite_code),
  );

  async function handleShare() {
    if (!league) return;
    try {
      await shareLeague(league);
    } catch {
      // Share sheet cancelled or unavailable.
    }
  }
  const openAddGame = () => {
    if (!selectedSport) return;
    navigation.navigate('AddGame', {
      sportId: selectedSport.id,
      sportName: selectedSport.name,
      templateId: selectedSport.template_id,
      playersPerSide: selectedSport.players_per_side,
      scoreMode: selectedSport.score_mode,
      sideKind: selectedSport.side_kind,
      focus: league?.focus,
      leagueName,
    });
  };

  function openEditGame(game: Game) {
    if (!selectedSport) return;
    navigation.navigate('AddGame', {
      sportId: selectedSport.id,
      sportName: selectedSport.name,
      templateId: selectedSport.template_id,
      playersPerSide: selectedSport.players_per_side,
      scoreMode: selectedSport.score_mode,
      sideKind: selectedSport.side_kind,
      focus: league?.focus,
      leagueName,
      gameId: game.id,
      winners: game.winners,
      losers: game.losers,
      winnerScore: game.winner_score,
      loserScore: game.loser_score,
      gameDate: game.game_date,
    });
  }

  async function confirmDeleteGame() {
    if (!token || !deleteGame || !selectedSport) return;
    setDeleting(true);
    setError('');
    try {
      await api.deleteGame(token, deleteGame.id);
      setDeleteGame(null);
      await loadStats(selectedSport);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete game');
      setDeleteGame(null);
    } finally {
      setDeleting(false);
    }
  }

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
        {canShare ? (
          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareButton}
            accessibilityLabel="Share league"
          >
            <Ionicons name="share-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
        {selectedSport && isMember ? (
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
        ) : null}
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
              {selectedSport && isMember ? (
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
              {todayStats.length > 0 ? (
                <CollapsibleSection title="Today's stats" count={todayStats.length}>
                  <StatsTable stats={todayStats} onPlayerPress={openPlayer} />
                </CollapsibleSection>
              ) : null}
              <CollapsibleSection title="Standings" count={stats.length}>
                <StatsTable
                  stats={stats}
                  showPlusMinus={false}
                  onPlayerPress={openPlayer}
                />
              </CollapsibleSection>
              <CollapsibleSection title="Games" count={games.length}>
                <GameList
                  games={games}
                  canEdit={!!canEdit}
                  winLoss={selectedSport?.score_mode === 'win_loss'}
                  onEdit={openEditGame}
                  onDelete={setDeleteGame}
                />
              </CollapsibleSection>
            </>
          )}
        </ScrollView>
      )}

      <Modal
        visible={!!deleteGame}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setDeleteGame(null);
        }}
      >
        <View style={styles.modalScrim}>
          <LinearGradient
            colors={['#FECACA', '#FDBA74', '#FB7185']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={26} color="#9F1239" />
              <Text style={styles.modalTitle}>Delete this game?</Text>
            </View>
            <Text style={styles.modalBody}>
              This result comes out of standings. You can log it again later if you need to.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalKeep}
                onPress={() => setDeleteGame(null)}
                disabled={deleting}
              >
                <Text style={styles.modalKeepText}>Keep game</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDelete}
                onPress={confirmDeleteGame}
                disabled={deleting}
              >
                <Text style={styles.modalDeleteText}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
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
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    marginRight: spacing.sm,
  },
  leagueName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  sportMeta: {
    marginTop: 8,
    marginBottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(219, 234, 254, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.95)',
    maxWidth: '90%',
  },
  sportMetaText: {
    color: '#1E3A8A',
    fontWeight: '700',
    fontSize: 13,
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
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(127, 29, 29, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(190, 18, 60, 0.35)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#7F1D1D',
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#9F1239',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalKeep: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  modalKeepText: {
    fontWeight: '700',
    color: '#7F1D1D',
  },
  modalDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#9F1239',
  },
  modalDeleteText: {
    fontWeight: '700',
    color: '#fff',
  },
});
