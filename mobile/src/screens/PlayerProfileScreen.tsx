import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { ErrorBanner } from '../components/ErrorBanner';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { GameList } from '../components/GameList';
import { GlassCard } from '../components/GlassCard';
import { LeagueIcon } from '../components/LeagueIcon';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { TemplateGlyph } from '../components/TemplateGlyph';
import { colors, spacing } from '../constants/theme';
import { formatPlusMinus, initials, winPctColor } from '../lib/names';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { sharePlayerProfile } from '../lib/leagueLinks';
import type { PlayerProfile, PlayerStat } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerProfile'>;

export function PlayerProfileScreen({ route, navigation }: Props) {
  const {
    sportId,
    playerName,
    sportName,
    leagueName,
    leagueSlug,
    sportTemplateId,
    sportCategory,
    leagueIcon,
  } = route.params;
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

  const displayName = profile?.player || playerName;
  const displayLeague = profile?.league?.name || leagueName;
  const displaySport = profile?.sport?.name || sportName;
  const slug = profile?.league?.slug || leagueSlug;
  const icon = profile?.league?.icon ?? leagueIcon ?? null;
  const templateId = profile?.sport?.template_id || sportTemplateId;
  const category = profile?.sport?.category || sportCategory;
  const shareUrl = profile?.share_url || null;
  const canShare = Boolean(shareUrl);
  const canEdit = Boolean(profile?.can_edit);
  const hasPartners = (profile?.sport?.players_per_side ?? 1) > 1;

  const streakColor = profile?.streak.endsWith('W')
    ? colors.win
    : profile?.streak.endsWith('L')
      ? colors.loss
      : colors.neutral;

  function openPlayer(name: string) {
    navigation.push('PlayerProfile', {
      sportId,
      playerName: name,
      sportName: displaySport,
      leagueName: displayLeague,
      leagueSlug: slug,
      sportTemplateId: templateId,
      sportCategory: category,
      leagueIcon: icon,
    });
  }

  async function handleShare() {
    if (!shareUrl) return;
    try {
      await sharePlayerProfile({
        playerName: displayName,
        leagueName: displayLeague,
        url: shareUrl,
      });
    } catch {
      // Share sheet cancelled or unavailable.
    }
  }

  return (
    <ScreenScaffold>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.topBarSpacer} />
        <View style={styles.topActions}>
          {canEdit ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('EditPlayer', {
                  sportId,
                  playerName: displayName,
                  avatarUrl: profile?.avatar_url ?? null,
                  sportName: displaySport,
                  leagueName: displayLeague,
                  leagueSlug: slug,
                  sportTemplateId: templateId,
                  sportCategory: category,
                  leagueIcon: icon,
                })
              }
              style={styles.blueAction}
              accessibilityLabel="Edit player"
            >
              <Ionicons name="pencil" size={20} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
          {canShare ? (
            <TouchableOpacity onPress={handleShare} style={styles.blueAction} accessibilityLabel="Share player">
              <Ionicons name="share-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <ErrorBanner message={error} />
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : profile ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials(profile.player)}</Text>
              )}
            </View>
            <View style={styles.heroText}>
              <Text style={styles.name}>{profile.player}</Text>
              <View style={styles.pills}>
                {slug ? (
                  <TouchableOpacity
                    style={styles.pill}
                    onPress={() => navigation.navigate('League', { slug, name: displayLeague })}
                    activeOpacity={0.85}
                  >
                    <LeagueIcon id={icon} size={16} />
                    <Text style={styles.pillText} numberOfLines={1}>
                      {displayLeague}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.pill}>
                    <LeagueIcon id={icon} size={16} />
                    <Text style={styles.pillText} numberOfLines={1}>
                      {displayLeague}
                    </Text>
                  </View>
                )}
                <View style={styles.pill}>
                  {templateId ? (
                    <TemplateGlyph
                      template={{ id: templateId, category: category || 'custom' }}
                      size={16}
                    />
                  ) : null}
                  <Text style={styles.pillText} numberOfLines={1}>
                    {displaySport}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <Kpi value={String(profile.wins)} label="Wins" color={colors.win} />
            <Kpi value={String(profile.losses)} label="Losses" color={colors.loss} />
            <Kpi
              value={`${(profile.win_pct * 100).toFixed(0)}%`}
              label={profile.rank ? `Win % · #${profile.rank} of ${profile.field_size}` : 'Win %'}
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
              label="Streak"
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

          {hasPartners ? (
            <CollapsibleSection
              title="Stats with partners"
              count={profile.partners.length}
            >
              {profile.min_games && profile.min_games > 1 ? (
                <Text style={styles.sectionHint}>
                  {profile.min_games}+ games together (5% of this player's games)
                </Text>
              ) : null}
              <PairTable rows={profile.partners} onPress={openPlayer} />
            </CollapsibleSection>
          ) : null}

          {hasPartners && (profile.occasional_partners?.length ?? 0) > 0 ? (
            <CollapsibleSection
              title="Occasional partners"
              count={profile.occasional_partners!.length}
              defaultOpen={false}
            >
              <Text style={styles.sectionHint}>
                Under {profile.min_games ?? 1} games together
              </Text>
              <PairTable rows={profile.occasional_partners!} onPress={openPlayer} />
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection
            title="Stats vs opponents"
            count={profile.opponents.length}
          >
            {profile.min_games && profile.min_games > 1 ? (
              <Text style={styles.sectionHint}>
                {profile.min_games}+ games against (5% of this player's games)
              </Text>
            ) : null}
            <PairTable rows={profile.opponents} onPress={openPlayer} />
          </CollapsibleSection>

          {(profile.occasional_opponents?.length ?? 0) > 0 ? (
            <CollapsibleSection
              title="Occasional opponents"
              count={profile.occasional_opponents!.length}
              defaultOpen={false}
            >
              <Text style={styles.sectionHint}>
                Under {profile.min_games ?? 1} games against
              </Text>
              <PairTable rows={profile.occasional_opponents!} onPress={openPlayer} />
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection
            title="Games"
            count={profile.player_games?.length ?? 0}
            defaultOpen={false}
          >
            <GameList
              games={profile.player_games ?? []}
              canEdit={false}
              winLoss={profile.sport?.score_mode === 'win_loss'}
              onEdit={() => undefined}
              onDelete={() => undefined}
            />
          </CollapsibleSection>
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
  rows,
  onPress,
}: {
  rows: PlayerStat[];
  onPress: (name: string) => void;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const cellSize = compact ? 13 : 15;
  const headerSize = compact ? 10 : 12;
  const statWidth = compact ? 28 : 36;
  const rowPadH = compact ? 10 : 16;
  if (rows.length === 0) {
    return <Text style={styles.emptyTable}>No rows yet.</Text>;
  }
  return (
    <GlassCard style={styles.pairCard}>
      <View style={[styles.pairHeader, { paddingHorizontal: rowPadH }]}>
        <Text style={[styles.pairTh, styles.pairPlayer, { fontSize: headerSize }]}>Player</Text>
        <Text style={[styles.pairTh, { width: statWidth, fontSize: headerSize, color: colors.win }]}>W</Text>
        <Text style={[styles.pairTh, { width: statWidth, fontSize: headerSize, color: colors.loss }]}>L</Text>
        <Text style={[styles.pairTh, { width: statWidth, fontSize: headerSize, color: colors.neutral }]}>%</Text>
        <Text style={[styles.pairTh, { width: statWidth, fontSize: headerSize, color: colors.neutral }]}>G</Text>
      </View>
      {rows.map((row, index) => (
        <TouchableOpacity
          key={row.player}
          style={[styles.pairRow, { paddingHorizontal: rowPadH }, index % 2 === 1 && styles.pairAlt]}
          onPress={() => onPress(row.player)}
        >
          <Text style={[styles.pairPlayer, styles.pairName, { fontSize: cellSize }]}>
            {row.player}
          </Text>
          <Text style={[styles.pairTd, { width: statWidth, fontSize: cellSize, color: colors.win }]}>{row.wins}</Text>
          <Text style={[styles.pairTd, { width: statWidth, fontSize: cellSize, color: colors.loss }]}>{row.losses}</Text>
          <Text style={[styles.pairTd, { width: statWidth, fontSize: cellSize, color: winPctColor(row.win_pct, colors) }]}>
            {(row.win_pct * 100).toFixed(0)}
          </Text>
          <Text style={[styles.pairTd, { width: statWidth, fontSize: cellSize, color: colors.neutral }]}>{row.games}</Text>
        </TouchableOpacity>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  topBarSpacer: {
    flex: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  blueAction: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: 72,
    height: 72,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(219, 234, 254, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.95)',
  },
  pillText: {
    color: '#1E3A8A',
    fontWeight: '700',
    fontSize: 13,
    flexShrink: 1,
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
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  emptyTable: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
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
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  pairTd: {
    textAlign: 'center',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  pairPlayer: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
    textAlign: 'left',
  },
  pairName: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(37, 99, 235, 0.35)',
  },
});
