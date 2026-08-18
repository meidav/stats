import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ErrorBanner } from '../components/ErrorBanner';
import { GlassCard } from '../components/GlassCard';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { TemplateGlyph } from '../components/TemplateGlyph';
import { LeagueIcon } from '../components/LeagueIcon';
import { APP_NAME, APP_TAGLINE } from '../constants/brand';
import { colors, gradients, spacing } from '../constants/theme';
import { copyForFocus, focusFromLeagues } from '../lib/focus';
import { useAuth } from '../lib/auth';
import { ApiError, api } from '../lib/api';
import { loadCachedLeagues, removeCachedLeague, saveCachedLeagues } from '../lib/leagueCache';
import type { League } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { token, user, logout } = useAuth();
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
      if (next.length === 0) {
        const cached = await loadCachedLeagues();
        if (cached.length > 0) {
          setLeagues(cached);
          setError('');
          return;
        }
      }
      setLeagues(next);
      setError('');
      await saveCachedLeagues(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load leagues');
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
    <ScreenScaffold
      footer={
        <View style={styles.footer}>
          <Text style={styles.user} numberOfLines={1}>
            {user?.email || user?.username}
          </Text>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.hero}>
        <LinearGradient
          colors={[...gradients.brandText]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.brandBadge}
        >
          <Text style={styles.brand}>{APP_NAME}</Text>
        </LinearGradient>
        <Text style={styles.tagline}>{APP_TAGLINE}</Text>
      </View>

      {hasLeagues ? <Text style={styles.sectionTitle}>{copy.homeTitle}</Text> : null}

      <ErrorBanner message={error} />

      {loading && !hasLeagues ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
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
          contentContainerStyle={hasLeagues ? styles.list : styles.emptyList}
          ListFooterComponent={
            hasLeagues ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateLeague')}
                activeOpacity={0.85}
                style={styles.newLeagueWrap}
              >
                <LinearGradient
                  colors={[...gradients.button]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.newLeagueButton}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.newLeagueText}>{copy.newAction}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            error ? (
              <Text style={styles.retryHint}>Pull down to try again.</Text>
            ) : (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🏆</Text>
                <Text style={styles.emptyTitle}>{copy.homeEmpty}</Text>
                <Text style={styles.emptyBody}>
                  A league can be sports, game night, or both. Standings live here after you add games.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('CreateLeague')}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[...gradients.button]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.emptyButton}
                  >
                    <Text style={styles.emptyButtonText}>Create a league</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </GlassCard>
            )
          }
          renderItem={({ item }) => {
            const sport = item.sports?.[0];
            const canEdit = item.role === 'owner' || item.role === 'admin';
            return (
              <GlassCard style={styles.leagueCard}>
                <View style={styles.leagueRow}>
                  <TouchableOpacity
                    style={styles.leagueMain}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('League', { slug: item.slug, name: item.name })}
                  >
                    {item.icon ? (
                      <LeagueIcon id={item.icon} size={26} />
                    ) : sport ? (
                      <TemplateGlyph
                        template={{
                          id: sport.template_id,
                          category: sport.category || 'custom',
                        }}
                        size={26}
                      />
                    ) : (
                      <LeagueIcon id="trophy" size={26} />
                    )}
                    <View style={styles.leagueCopy}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {sport?.name || 'No games yet'}
                        {' · '}
                        {item.visibility}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {canEdit ? (
                    <View style={styles.leagueActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() =>
                          navigation.navigate('EditLeague', {
                            slug: item.slug,
                            name: item.name,
                            icon: item.icon ?? null,
                          })
                        }
                        accessibilityLabel={`Edit ${item.name}`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => openDelete(item)}
                        accessibilityLabel={`Delete ${item.name}`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </GlassCard>
            );
          }}
        />
      )}

      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={closeDelete}
      >
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {deleteStep === 1 ? 'Delete this league?' : 'Remove all history?'}
            </Text>
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
          </View>
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
  brandBadge: {
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  tagline: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
  leagueCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
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
    gap: spacing.md,
  },
  leagueCopy: {
    flex: 1,
  },
  leagueActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  cardMeta: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  user: {
    color: colors.textMuted,
    fontSize: 13,
    maxWidth: '62%',
  },
  footerDot: {
    color: colors.textMuted,
  },
  logoutText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  newLeagueWrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  newLeagueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newLeagueText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
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
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  modalKeepText: {
    fontWeight: '700',
    color: colors.text,
  },
  modalDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.danger,
  },
  modalDeleteText: {
    fontWeight: '700',
    color: '#fff',
  },
});
