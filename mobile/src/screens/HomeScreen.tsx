import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ErrorBanner } from '../components/ErrorBanner';
import { GlassCard } from '../components/GlassCard';
import { GamesCountBadge, gamesBadgeRoom, gamesBadgeRoomTablet } from '../components/GamesCountBadge';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { TemplateGlyph } from '../components/TemplateGlyph';
import { LeagueIcon } from '../components/LeagueIcon';
import { IconActionRow } from '../components/IconActionRow';
import { BrandLockup } from '../components/BrandLockup';
import { AccountFooter, accentLilac } from '../components/AccountFooter';
import { GradientButton } from '../components/GradientButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { APP_TAGLINE } from '../constants/brand';
import { colors, gradients, spacing } from '../constants/theme';
import { copyForFocus, focusFromLeagues } from '../lib/focus';
import { selectedIconForLeague } from '../lib/leagueIcons';
import { useAuth } from '../lib/auth';
import { ApiError, api } from '../lib/api';
import { useIsTablet } from '../lib/layout';
import { loadCachedLeagues, removeCachedLeague, saveCachedLeagues } from '../lib/leagueCache';
import type { League } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { height: windowHeight } = useWindowDimensions();
  const isTablet = useIsTablet();
  const compactEmpty = !isTablet && windowHeight < 860;
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<League | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleting, setDeleting] = useState(false);

  const loadLeagues = useCallback(async (showSpinner = false) => {
    if (!token) return;
    if (showSpinner) setLoading(true);
    try {
      const result = await api.getMyLeagues(token);
      const next = result.leagues ?? [];
      // Always trust a successful /mine response, including an empty list.
      // Falling back to cache here caused viewed public leagues to appear as "mine".
      setLeagues(next);
      setError('');
      await saveCachedLeagues(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load leagues');
      const cached = await loadCachedLeagues();
      if (cached.length > 0) {
        setLeagues(cached);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function boot() {
        const cached = await loadCachedLeagues();
        if (!active) return;
        if (cached.length) {
          setLeagues(cached);
          setLoading(false);
        }
        await loadLeagues(!cached.length);
      }
      boot();
      return () => {
        active = false;
      };
    }, [loadLeagues]),
  );

  const copy = copyForFocus(focusFromLeagues(leagues));
  const hasLeagues = leagues.length > 0;

  function openDelete(league: League) {
    setDeleteTarget(league);
    setDeleteStep(1);
  }

  function closeDelete() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteStep(1);
  }

  async function confirmDelete() {
    if (!token || !deleteTarget) return;
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await api.deleteLeague(token, deleteTarget.slug);
      const next = await removeCachedLeague(deleteTarget.id);
      setLeagues(next);
      setDeleteTarget(null);
      setDeleteStep(1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete league');
      setDeleteTarget(null);
      setDeleteStep(1);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScreenScaffold footer={<AccountFooter />}>
      <View style={[styles.hero, compactEmpty && styles.heroCompact]}>
        <BrandLockup size={compactEmpty ? 108 : 132} />
        <Text style={[styles.tagline, compactEmpty && styles.taglineCompact]}>{APP_TAGLINE}</Text>
      </View>

      {hasLeagues ? (
        <Text style={styles.sectionTitle}>{copy.homeTitle}</Text>
      ) : null}

      <ErrorBanner message={error} />

      {loading && !hasLeagues ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : hasLeagues ? (
        <View style={[styles.listColumn, isTablet && styles.listColumnTablet]}>
          <FlatList
            data={leagues}
            keyExtractor={(item) => String(item.id)}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadLeagues();
                }}
                tintColor={colors.primary}
              />
            }
            contentContainerStyle={styles.list}
            ListFooterComponent={
              <View style={styles.footerActions}>
                <SecondaryButton
                  label="Browse public leagues"
                  onPress={() => navigation.navigate('DiscoverLeagues')}
                  style={styles.ctaHalf}
                />
                <TouchableOpacity
                  onPress={() => navigation.navigate('CreateLeague')}
                  activeOpacity={0.85}
                  style={styles.ctaHalf}
                >
                  <LinearGradient
                    colors={[...gradients.button]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.newLeagueButton}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.newLeagueText} numberOfLines={1}>
                      {copy.newAction}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => {
              const sport = item.sports?.[0];
              const canEdit = item.role === 'owner' || item.role === 'admin';
              const displayIcon = selectedIconForLeague(item);
              const gameCount = item.game_count ?? 0;
              return (
                <View
                  style={[
                    styles.leagueCardWrap,
                    gamesBadgeRoom,
                    isTablet && gamesBadgeRoomTablet,
                  ]}
                >
                  <GlassCard style={styles.leagueCard}>
                    <View style={styles.leagueRow}>
                      <TouchableOpacity
                        style={styles.leagueMain}
                        activeOpacity={0.85}
                        onPress={() =>
                          navigation.navigate('League', {
                            slug: item.slug,
                            name: item.name,
                            role: item.role,
                          })
                        }
                      >
                        {displayIcon ? (
                          <LeagueIcon id={displayIcon} size={24} />
                        ) : sport ? (
                          <TemplateGlyph
                            template={{
                              id: sport.template_id,
                              category: sport.category || 'custom',
                            }}
                            size={24}
                          />
                        ) : (
                          <LeagueIcon id="trophy" size={24} />
                        )}
                        <View style={styles.leagueCopy}>
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {item.name}
                          </Text>
                          <Text style={styles.cardMeta} numberOfLines={1}>
                            {sport?.name || 'No sport yet'}
                            {' · '}
                            {item.visibility}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {canEdit ? (
                        <IconActionRow
                          onEdit={() =>
                            navigation.navigate('EditLeague', {
                              slug: item.slug,
                              name: item.name,
                              icon: item.icon ?? null,
                              visibility: item.visibility,
                              sportTemplateId: sport?.template_id,
                            })
                          }
                          onDelete={() => openDelete(item)}
                          editLabel={`Edit ${item.name}`}
                          deleteLabel={`Delete ${item.name}`}
                        />
                      ) : null}
                    </View>
                  </GlassCard>
                  <GamesCountBadge count={gameCount} />
                </View>
              );
            }}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.emptyScroll}
          contentContainerStyle={styles.emptyHost}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {error ? (
            <Text style={styles.retryHint}>Pull down to try again.</Text>
          ) : (
            <View
              style={[
                styles.emptyStack,
                isTablet && styles.emptyStackTablet,
                compactEmpty && styles.emptyStackCompact,
              ]}
            >
              <GlassCard style={[styles.emptyCard, compactEmpty && styles.emptyCardCompact]}>
                <View style={styles.emptyCardTop}>
                  <Text style={[styles.emptyEmoji, compactEmpty && styles.emptyEmojiCompact]}>
                    🏆
                  </Text>
                  <Text
                    style={[styles.emptyTitle, compactEmpty && styles.emptyTitleCompact]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {copy.homeEmpty}
                  </Text>
                  <Text style={[styles.emptyBody, compactEmpty && styles.emptyBodyCompact]}>
                    A league is one sport or one game night. Standings live here after you add games.
                  </Text>
                </View>
                <GradientButton
                  label="Create a league"
                  onPress={() => navigation.navigate('CreateLeague')}
                  style={styles.emptyCta}
                />
              </GlassCard>

              <GlassCard style={[styles.emptyCard, compactEmpty && styles.emptyCardCompact]}>
                <View style={styles.emptyCardTop}>
                  <Ionicons
                    name="earth"
                    size={compactEmpty ? 36 : 48}
                    color={accentLilac}
                    style={[styles.emptyGlyph, compactEmpty && styles.emptyGlyphCompact]}
                  />
                  <Text
                    style={[styles.emptyTitle, compactEmpty && styles.emptyTitleCompact]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    View public leagues
                  </Text>
                  <Text style={[styles.emptyBody, compactEmpty && styles.emptyBodyCompact]}>
                    Browse open leagues on PlayTracker and check standings before you create your own.
                  </Text>
                </View>
                <SecondaryButton
                  label="Browse public leagues"
                  onPress={() => navigation.navigate('DiscoverLeagues')}
                  style={styles.emptyCta}
                />
              </GlassCard>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={closeDelete}
      >
        <View style={styles.modalScrim}>
          <LinearGradient
            colors={['#FECACA', '#FDBA74', '#FB7185']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={28} color="#9F1239" />
              <Text style={styles.modalTitle}>
                {deleteStep === 1 ? 'Delete this league?' : 'Remove all history?'}
              </Text>
            </View>
            <Text style={styles.modalBody}>
              {deleteStep === 1
                ? `This will delete ${deleteTarget?.name || 'this league'} and all of its stats. This cannot be undone.`
                : 'This removes all history of this league and its stats. There is no way to get it back.'}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalKeep}
                onPress={closeDelete}
                disabled={deleting}
              >
                <Text style={styles.modalKeepText}>Keep league</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDelete}
                onPress={confirmDelete}
                disabled={deleting}
              >
                <Text style={styles.modalDeleteText}>
                  {deleting ? 'Deleting...' : deleteStep === 1 ? 'Delete' : 'Delete everything'}
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
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  heroCompact: {
    marginBottom: spacing.sm,
  },
  tagline: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  taglineCompact: {
    marginTop: spacing.sm,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  loader: {
    marginTop: spacing.lg,
  },
  listColumn: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  listColumnTablet: {
    width: '75%',
    maxWidth: 720,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    paddingBottom: spacing.lg,
  },
  emptyScroll: {
    flex: 1,
  },
  emptyHost: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyStack: {
    width: '100%',
    gap: spacing.lg,
  },
  emptyStackTablet: {
    // Match roughly one half of the previous side-by-side pair.
    width: '50%',
    maxWidth: 440,
  },
  emptyStackCompact: {
    gap: spacing.md,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  emptyCardCompact: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emptyCardTop: {
    alignItems: 'center',
  },
  emptyGlyph: {
    marginBottom: spacing.md,
  },
  emptyGlyphCompact: {
    marginBottom: spacing.sm,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyEmojiCompact: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
    width: '100%',
  },
  emptyTitleCompact: {
    fontSize: 17,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 0,
  },
  emptyBodyCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCta: {
    alignSelf: 'stretch',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  ctaHalf: {
    flex: 1,
  },
  newLeagueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 52,
  },
  newLeagueText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
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
  retryHint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 15,
  },
  leagueCardWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  leagueCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  leagueMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  leagueCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 21,
  },
  cardMeta: {
    marginTop: 2,
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
    textTransform: 'capitalize',
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
    textAlign: 'left',
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
