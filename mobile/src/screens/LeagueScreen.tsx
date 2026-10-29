import { Export, PencilSimple, Plus, Warning } from '../components/icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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

import { YearFilterRow } from '../components/YearFilterRow';
import { ErrorBanner } from '../components/ErrorBanner';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { GameList } from '../components/GameList';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SportTypePill } from '../components/SportTypePill';
import { StatsTable } from '../components/StatsTable';
import { TemplateGlyph } from '../components/TemplateGlyph';
import { spacing } from '../constants/theme';
import { addGameTitleForTemplate } from '../lib/focus';
import { localToday } from '../lib/datetime';
import { useAuth } from '../lib/auth';
import { ApiError, api } from '../lib/api';
import { upsertCachedLeague } from '../lib/leagueCache';
import { shareLeague } from '../lib/leagueLinks';
import { firstResultCopy } from '../lib/names';
import { useThemeTokens } from '../lib/theme';
import type { Game, League, PlayerStat, Sport } from '../types';
import type { LeagueStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<LeagueStackParamList, 'League'>;

const GAMES_PAGE_SIZE = 50;

export function LeagueScreen({ route, navigation }: Props) {
  const theme = useThemeTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { colors, gradients } = theme;
  const { slug, name, role: routeRole } = route.params;
  const { token } = useAuth();
  const [league, setLeague] = useState<League | null>(null);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [occasionalStats, setOccasionalStats] = useState<PlayerStat[]>([]);
  const [todayStats, setTodayStats] = useState<PlayerStat[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gamesTotal, setGamesTotal] = useState(0);
  const [hasMoreGames, setHasMoreGames] = useState(false);
  const [loadingMoreGames, setLoadingMoreGames] = useState(false);
  const [minGames, setMinGames] = useState(10);
  const [years, setYears] = useState<Array<{ year: string; games: number }>>([]);
  const [selectedYear, setSelectedYear] = useState<string | null>(() =>
    String(new Date().getFullYear()),
  );
  const [totalGames, setTotalGames] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deleteGame, setDeleteGame] = useState<Game | null>(null);
  const [deleting, setDeleting] = useState(false);
  const selectedIdRef = useRef<number | null>(null);
  const selectedYearRef = useRef<string | null>(selectedYear);
  const hasContentRef = useRef(false);
  selectedYearRef.current = selectedYear;

  const loadStats = useCallback(async (sport: Sport, year: string | null) => {
    const currentYear = String(new Date().getFullYear());
    const showToday = !year || year === currentYear;
    const [statsData, gamesData] = await Promise.all([
      api.getSportStats(sport.id, token, {
        today: showToday ? localToday() : undefined,
        year,
      }),
      api.getSportGames(sport.id, token, {
        year,
        limit: GAMES_PAGE_SIZE,
        offset: 0,
      }),
    ]);
    setStats(statsData.stats);
    setOccasionalStats(statsData.occasional_stats ?? []);
    setTodayStats(statsData.today_stats ?? []);
    setMinGames(statsData.min_games);
    setYears(statsData.years ?? []);
    setTotalGames(statsData.total_games);
    setGames(gamesData.games ?? []);
    setGamesTotal(gamesData.total ?? gamesData.games?.length ?? 0);
    setHasMoreGames(gamesData.has_more ?? false);
    const availableYears = statsData.years ?? [];
    if (year && availableYears.length > 0 && !availableYears.some((item) => item.year === year)) {
      const fallback = availableYears[0].year;
      setSelectedYear(fallback);
      const [fallbackStats, fallbackGames] = await Promise.all([
        api.getSportStats(sport.id, token, {
          today: fallback === String(new Date().getFullYear()) ? localToday() : undefined,
          year: fallback,
        }),
        api.getSportGames(sport.id, token, {
          year: fallback,
          limit: GAMES_PAGE_SIZE,
          offset: 0,
        }),
      ]);
      setStats(fallbackStats.stats);
      setOccasionalStats(fallbackStats.occasional_stats ?? []);
      setTodayStats(fallbackStats.today_stats ?? []);
      setMinGames(fallbackStats.min_games);
      setYears(fallbackStats.years ?? []);
      setTotalGames(fallbackStats.total_games);
      setGames(fallbackGames.games ?? []);
      setGamesTotal(fallbackGames.total ?? fallbackGames.games?.length ?? 0);
      setHasMoreGames(fallbackGames.has_more ?? false);
    }
  }, [token]);

  const loadMoreGames = useCallback(async () => {
    if (!selectedSport || loadingMoreGames || !hasMoreGames) return;
    setLoadingMoreGames(true);
    try {
      const gamesData = await api.getSportGames(selectedSport.id, token, {
        year: selectedYear,
        limit: GAMES_PAGE_SIZE,
        offset: games.length,
      });
      setGames((prev) => [...prev, ...(gamesData.games ?? [])]);
      setGamesTotal(gamesData.total ?? games.length + (gamesData.games?.length ?? 0));
      setHasMoreGames(gamesData.has_more ?? false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load more games');
    } finally {
      setLoadingMoreGames(false);
    }
  }, [selectedSport, loadingMoreGames, hasMoreGames, token, selectedYear, games.length]);

  const refreshLeague = useCallback(
    async (options?: { showSpinner?: boolean; pull?: boolean }) => {
      const showSpinner = Boolean(options?.showSpinner);
      if (showSpinner) setLoading(true);
      if (options?.pull) setRefreshing(true);
      try {
        const leagueData = await api.getLeague(slug, token);
        setLeague(leagueData);
        if (leagueData.role) {
          await upsertCachedLeague(leagueData);
        }
        const sport =
          leagueData.sports.find((item) => item.id === selectedIdRef.current) ??
          leagueData.sports[0] ??
          null;
        selectedIdRef.current = sport?.id ?? null;
        setSelectedSport(sport);
        if (sport) {
          await loadStats(sport, selectedYearRef.current);
        } else {
          setStats([]);
          setOccasionalStats([]);
          setTodayStats([]);
          setGames([]);
          setGamesTotal(0);
          setHasMoreGames(false);
          setYears([]);
          setTotalGames(0);
        }
        hasContentRef.current = true;
        setError('');
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not load league');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [slug, token, loadStats],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function boot() {
        // Keep existing league UI on screen; only spin on cold open.
        const showSpinner = !hasContentRef.current;
        if (showSpinner) setLoading(true);
        try {
          const leagueData = await api.getLeague(slug, token);
          if (!active) return;
          setLeague(leagueData);
          if (leagueData.role) {
            await upsertCachedLeague(leagueData);
          }
          if (!active) return;
          const sport =
            leagueData.sports.find((item) => item.id === selectedIdRef.current) ??
            leagueData.sports[0] ??
            null;
          selectedIdRef.current = sport?.id ?? null;
          setSelectedSport(sport);
          if (sport) {
            await loadStats(sport, selectedYearRef.current);
          } else {
            setStats([]);
            setOccasionalStats([]);
            setTodayStats([]);
            setGames([]);
            setGamesTotal(0);
            setHasMoreGames(false);
            setYears([]);
            setTotalGames(0);
          }
          if (!active) return;
          hasContentRef.current = true;
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
      boot();
      return () => {
        active = false;
      };
    }, [slug, token, loadStats]),
  );

  async function selectSport(sport: Sport) {
    selectedIdRef.current = sport.id;
    setSelectedSport(sport);
    const year = String(new Date().getFullYear());
    setSelectedYear(year);
    setLoading(true);
    try {
      await loadStats(sport, year);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load stats');
    } finally {
      setLoading(false);
    }
  }

  async function selectYear(year: string | null) {
    if (!selectedSport || year === selectedYear) return;
    setSelectedYear(year);
    setLoading(true);
    try {
      await loadStats(selectedSport, year);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load stats');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    await refreshLeague({ pull: true });
  }

  const leagueName = league?.name || name || '';
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
      sportCategory: selectedSport.category,
      playersPerSide: selectedSport.players_per_side,
      scoreMode: selectedSport.score_mode,
      scoresOptional: selectedSport.scores_optional,
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
      sportCategory: selectedSport.category,
      playersPerSide: selectedSport.players_per_side,
      scoreMode: selectedSport.score_mode,
      scoresOptional: selectedSport.scores_optional,
      sideKind: selectedSport.side_kind,
      focus: league?.focus,
      leagueName,
      gameId: game.id,
      winners: game.winners,
      losers: game.losers,
      winnerScore: game.winner_score ?? undefined,
      loserScore: game.loser_score ?? undefined,
      gameDate: game.game_date,
      metadata: game.metadata,
    });
  }

  async function confirmDeleteGame() {
    if (!token || !deleteGame || !selectedSport) return;
    setDeleting(true);
    setError('');
    try {
      await api.deleteGame(token, deleteGame.id);
      setDeleteGame(null);
      await loadStats(selectedSport, selectedYear);
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
      leagueSlug: slug,
      sportTemplateId: selectedSport.template_id,
      sportCategory: selectedSport.category,
      leagueIcon: league?.icon ?? null,
    });
  }

  const allTimeGames = years.reduce((sum, item) => sum + item.games, 0) || totalGames;
  const yearLabel = selectedYear ?? 'All time';
  const standingsHint =
    minGames > 1 && totalGames > 0
      ? `${minGames}+ games to rank (5% of ${totalGames} games${selectedYear ? ` in ${selectedYear}` : ''})`
      : undefined;

  return (
    <ScreenScaffold edgeHeader>
      <ScreenHeader
        title={leagueName}
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.topActions}>
            {canEdit ? (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('EditLeague', {
                    slug,
                    name: leagueName,
                    icon: league?.icon ?? null,
                    visibility: league?.visibility,
                    sportTemplateId: league?.sports?.[0]?.template_id,
                  })
                }
                style={styles.headerIconBtn}
                accessibilityLabel="Edit league"
              >
                <PencilSimple size={20} color={styles.headerIconColor.color} weight="bold" />
              </TouchableOpacity>
            ) : null}
            {canShare ? (
              <TouchableOpacity
                onPress={handleShare}
                style={styles.headerIconBtn}
                accessibilityLabel="Share league"
              >
                <Export size={20} color={styles.headerIconColor.color} weight="bold" />
              </TouchableOpacity>
            ) : null}
            {selectedSport && isMember ? (
              <TouchableOpacity onPress={openAddGame} activeOpacity={0.85} style={styles.headerIconBtn}>
                <Plus size={18} color={styles.headerIconColor.color} weight="bold" />
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      {selectedSport ? (
        <SportTypePill
          name={selectedSport.name}
          templateId={selectedSport.template_id}
          category={selectedSport.category || 'custom'}
          style={{ marginTop: spacing.sm, marginBottom: spacing.md, marginHorizontal: spacing.lg }}
        />
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
          contentContainerStyle={totalGames === 0 ? styles.emptyList : styles.list}
        >
          {totalGames === 0 ? (
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
                    <Text style={styles.emptyButtonText}>
                      {addGameTitleForTemplate(selectedSport?.template_id)}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}
            </GlassCard>
          ) : (
            <>
              <YearFilterRow
                years={years}
                selectedYear={selectedYear}
                totalGames={allTimeGames}
                onSelect={selectYear}
              />
              {todayStats.length > 0 ? (
                <CollapsibleSection title="Today's stats" count={todayStats.length}>
                  <StatsTable stats={todayStats} onPlayerPress={openPlayer} />
                </CollapsibleSection>
              ) : null}
              <CollapsibleSection title="Standings" count={stats.length}>
                {standingsHint ? (
                  <Text style={styles.sectionHint}>{standingsHint}</Text>
                ) : null}
                {stats.length > 0 ? (
                  <StatsTable
                    stats={stats}
                    showPlusMinus={false}
                    onPlayerPress={openPlayer}
                  />
                ) : (
                  <Text style={styles.sectionEmpty}>
                    No one has {minGames}+ games yet for {yearLabel.toLowerCase()}.
                  </Text>
                )}
              </CollapsibleSection>
              {occasionalStats.length > 0 ? (
                <CollapsibleSection
                  title="Occasional players"
                  count={occasionalStats.length}
                  defaultOpen={false}
                >
                  <Text style={styles.sectionHint}>
                    Under {minGames} games (5% threshold{selectedYear ? ` in ${selectedYear}` : ''})
                  </Text>
                  <StatsTable
                    stats={occasionalStats}
                    showPlusMinus={false}
                    onPlayerPress={openPlayer}
                  />
                </CollapsibleSection>
              ) : null}
              <CollapsibleSection title="Games" count={gamesTotal}>
                <GameList
                  games={games}
                  canEdit={!!canEdit}
                  winLoss={selectedSport?.score_mode === 'win_loss'}
                  onEdit={openEditGame}
                  onDelete={setDeleteGame}
                />
                {hasMoreGames ? (
                  <TouchableOpacity
                    style={styles.loadMore}
                    onPress={loadMoreGames}
                    disabled={loadingMoreGames}
                    activeOpacity={0.85}
                  >
                    {loadingMoreGames ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Text style={styles.loadMoreText}>
                        Load more ({games.length} of {gamesTotal})
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
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
            colors={[...theme.gradients.modalDanger]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <Warning size={26} color={colors.danger} weight="fill" />
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

function makeStyles(theme: ReturnType<typeof useThemeTokens>) {
  const { colors } = theme;
  const activeChipText = theme.id === 'classic' ? '#121820' : '#fff';
  return StyleSheet.create({
    topActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    headerIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.1)',
    },
    headerIconColor: {
      color: theme.isDark ? '#F8FAFC' : colors.text,
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
      backgroundColor: colors.fieldBg,
      borderWidth: 1,
      borderColor: colors.fieldBorder,
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
      color: activeChipText,
    },
    loader: {
      marginTop: spacing.xl,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 120,
    },
    emptyList: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.lg,
      paddingBottom: 120,
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
      color: activeChipText,
      fontWeight: '700',
      fontSize: 16,
    },
    sectionHint: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 0,
      marginBottom: 12,
      paddingHorizontal: spacing.sm,
    },
    sectionEmpty: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
    loadMore: {
      marginTop: spacing.sm,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : `${colors.primary}1A`,
      borderWidth: 1,
      borderColor: colors.fieldBorder,
    },
    loadMoreText: {
      color: theme.isDark ? colors.primary : colors.primaryDark,
      fontWeight: '700',
      fontSize: 15,
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
      borderColor: theme.isDark ? 'rgba(248, 113, 113, 0.35)' : 'rgba(190, 18, 60, 0.35)',
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
      color: theme.isDark ? '#FECACA' : '#7F1D1D',
    },
    modalBody: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.isDark ? '#FECACA' : '#9F1239',
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
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255, 255, 255, 0.55)',
    },
    modalKeepText: {
      fontWeight: '700',
      color: theme.isDark ? '#F8FAFC' : '#7F1D1D',
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
}
