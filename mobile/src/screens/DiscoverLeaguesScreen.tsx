import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AccountFooter } from '../components/AccountFooter';
import { ErrorBanner } from '../components/ErrorBanner';
import { GlassCard } from '../components/GlassCard';
import { GamesCountBadge, gamesBadgeRoom, gamesBadgeRoomTablet } from '../components/GamesCountBadge';
import { LeagueIcon } from '../components/LeagueIcon';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { TemplateGlyph } from '../components/TemplateGlyph';
import { colors, spacing } from '../constants/theme';
import { ApiError, api } from '../lib/api';
import { selectedIconForLeague } from '../lib/leagueIcons';
import { useIsTablet } from '../lib/layout';
import type { Sport } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DiscoverLeagues'>;

type PublicLeague = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  sport_count?: number;
  sport_name?: string | null;
  template_id?: string | null;
  game_count?: number;
  share_url?: string | null;
};

function iconForPublicLeague(item: PublicLeague) {
  const sports = item.template_id
    ? ([{ template_id: item.template_id }] as Pick<Sport, 'template_id'>[])
    : [];
  return selectedIconForLeague({
    icon: item.icon,
    sports: sports as Sport[],
  });
}

export function DiscoverLeaguesScreen({ navigation }: Props) {
  const isTablet = useIsTablet();
  const [leagues, setLeagues] = useState<PublicLeague[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (search?: string, showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const result = await api.discoverLeagues(search?.trim() || undefined);
      setLeagues(result.leagues ?? []);
      setError('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load public leagues');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(undefined, true);
    }, [load]),
  );

  function submitSearch() {
    load(query, true);
  }

  return (
    <ScreenScaffold footer={<AccountFooter />}>
      <ScreenHeader title="Public leagues" onBack={() => navigation.goBack()} />

      <View style={[styles.body, isTablet && styles.bodyTablet]}>
        <Text style={styles.subtitle}>
          Browse open leagues on PlayTracker. Tap one to view standings and games.
        </Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search leagues"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={submitSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={submitSearch}>
            <Ionicons name="search" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <ErrorBanner message={error} />

        {loading && leagues.length === 0 ? (
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
                  load(query);
                }}
                tintColor={colors.primary}
              />
            }
            contentContainerStyle={[styles.list, leagues.length === 0 ? styles.emptyList : null]}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {error ? 'Pull down to try again.' : 'No public leagues match that search yet.'}
              </Text>
            }
            renderItem={({ item }) => {
              const displayIcon = iconForPublicLeague(item);
              const sportLabel = item.sport_name
                ? item.sport_name
                : item.sport_count === 1
                  ? '1 sport'
                  : `${item.sport_count ?? 0} sports`;
              const gameCount = item.game_count ?? 0;
              return (
                <View
                  style={[
                    styles.cardWrap,
                    gamesBadgeRoom,
                    isTablet && gamesBadgeRoomTablet,
                  ]}
                >
                  <GlassCard
                    style={styles.card}
                    onPress={() =>
                      navigation.navigate('League', {
                        slug: item.slug,
                        name: item.name,
                      })
                    }
                  >
                    <View style={styles.cardRow}>
                      <View style={styles.iconWrap}>
                        {displayIcon ? (
                          <LeagueIcon id={displayIcon} size={26} />
                        ) : item.template_id ? (
                          <TemplateGlyph
                            template={{ id: item.template_id, category: 'sports' }}
                            size={24}
                          />
                        ) : (
                          <LeagueIcon id="trophy" size={24} />
                        )}
                      </View>
                      <View style={styles.cardCopy}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.cardMeta} numberOfLines={1}>
                          {sportLabel} · public
                        </Text>
                      </View>
                    </View>
                  </GlassCard>
                  <GamesCountBadge count={gameCount} />
                </View>
              );
            }}
          />
        )}
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  bodyTablet: {
    width: '75%',
    maxWidth: 720,
    paddingHorizontal: spacing.md,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'rgba(255, 252, 248, 0.72)',
    color: colors.text,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginTop: spacing.xl,
  },
  list: {
    paddingBottom: spacing.lg,
    paddingTop: 4,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 15,
    paddingVertical: spacing.xl,
  },
  cardWrap: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
