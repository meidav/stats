import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { DateTimeField } from '../components/DateTimeField';
import { ErrorBanner } from '../components/ErrorBanner';
import { GradientButton } from '../components/GradientButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { colors, spacing } from '../constants/theme';
import { copyForFocus } from '../lib/focus';
import { formatLocalDateTime, parseLocalDateTime } from '../lib/datetime';
import { autoCapWords } from '../lib/names';
import {
  TENNIS_FORMATS,
  isTennisTemplate,
  setsFromMetadata,
  tennisScorePayload,
  type TennisFormat,
  type TennisSetInput,
} from '../lib/tennisSets';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { loadCachedLeagues } from '../lib/leagueCache';
import { loadCachedPlayers, rememberPlayers } from '../lib/playerCache';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddGame'>;
type FocusField = { side: 'winner' | 'loser'; index: number } | 'winnerScore' | 'loserScore' | null;

function padNames(names: string[] | undefined, count: number) {
  const next = [...(names || [])];
  while (next.length < count) next.push('');
  return next.slice(0, count);
}

export function AddGameScreen({ route, navigation }: Props) {
  const {
    sportId,
    sportName,
    templateId,
    playersPerSide,
    scoreMode = 'points',
    sideKind = 'player',
    focus = 'mixed',
    gameId,
    winners,
    losers,
    winnerScore: initialWinnerScore,
    loserScore: initialLoserScore,
    gameDate,
    metadata,
  } = route.params;
  const { token } = useAuth();
  const editing = Boolean(gameId);
  const winLoss = scoreMode === 'win_loss';
  const tennis = isTennisTemplate(templateId);
  const teamSides = sideKind === 'team' || templateId === 'indoor_volleyball';
  const oneOnOne = playersPerSide === 1 && !teamSides;
  const [winnerNames, setWinnerNames] = useState<string[]>(() => padNames(winners, playersPerSide));
  const [loserNames, setLoserNames] = useState<string[]>(() => padNames(losers, playersPerSide));
  const [winnerScore, setWinnerScore] = useState(
    initialWinnerScore != null ? String(initialWinnerScore) : '',
  );
  const [loserScore, setLoserScore] = useState(
    initialLoserScore != null ? String(initialLoserScore) : '',
  );
  const initialTennis = setsFromMetadata(metadata, initialWinnerScore, initialLoserScore);
  const [tennisFormat, setTennisFormat] = useState<TennisFormat>(initialTennis.format);
  const [tennisSets, setTennisSets] = useState<TennisSetInput[]>(initialTennis.sets);
  const [playedAt, setPlayedAt] = useState(() => parseLocalDateTime(gameDate));
  const [players, setPlayers] = useState<string[]>([]);
  const [winnerHint, setWinnerHint] = useState<number | null>(null);
  const [loserHints, setLoserHints] = useState<number[]>([]);
  const [focusField, setFocusField] = useState<FocusField>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function loadHints() {
      if (!token) return;
      const cached = await loadCachedPlayers();
      if (active && cached.length) setPlayers(cached);

      const leagues = await loadCachedLeagues();
      const [remote, sportGames, ...sportStats] = await Promise.all([
        api.getMyPlayers(token).catch(() => ({ players: [] as string[] })),
        api.getSportGames(sportId, token).catch(() => ({ games: [] as Array<{ winners: string[]; losers: string[] }> })),
        ...leagues.flatMap((league) =>
          (league.sports || []).map((sport) =>
            api.getSportStats(sport.id, token, { minGames: 1 }).catch(() => ({ stats: [] as Array<{ player: string }> })),
          ),
        ),
      ]);
      if (!active) return;
      const fromGames = (sportGames.games || []).flatMap((game) => [...game.winners, ...game.losers]);
      const fromStats = sportStats.flatMap((item) => (item.stats || []).map((row) => row.player));
      const merged = await rememberPlayers([
        ...(remote.players || []),
        ...fromGames,
        ...fromStats,
        ...cached,
      ]);
      setPlayers(merged);

      if (!winLoss) {
        try {
          const hints = await api.getScoreHints(sportId, token);
          if (!active) return;
          setWinnerHint(hints.winner_score);
          setLoserHints(hints.loser_scores ?? []);
        } catch {
          // Score chips are optional.
        }
      }
    }
    loadHints();
    return () => {
      active = false;
    };
  }, [token, sportId, winLoss]);

  const winnerLabels = useMemo(
    () =>
      Array.from({ length: playersPerSide }, (_, i) => {
        if (teamSides) return playersPerSide === 1 ? 'Winning team' : `Winning team ${i + 1}`;
        return oneOnOne ? 'Winner' : `Winner ${i + 1}`;
      }),
    [playersPerSide, oneOnOne, teamSides],
  );
  const loserLabels = useMemo(
    () =>
      Array.from({ length: playersPerSide }, (_, i) => {
        if (teamSides) return playersPerSide === 1 ? 'Losing team' : `Losing team ${i + 1}`;
        return oneOnOne ? 'Loser' : `Loser ${i + 1}`;
      }),
    [playersPerSide, oneOnOne, teamSides],
  );

  function suggestionsFor(value: string) {
    const query = value.trim().toLowerCase();
    const taken = [...winnerNames, ...loserNames]
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name && name !== query);
    return players
      .filter((name) => !taken.includes(name.toLowerCase()))
      .filter((name) => !query || name.toLowerCase().includes(query))
      .slice(0, 8);
  }

  function updateName(side: 'winner' | 'loser', index: number, value: string) {
    const next = autoCapWords(value);
    if (side === 'winner') {
      setWinnerNames((prev) => prev.map((name, i) => (i === index ? next : name)));
    } else {
      setLoserNames((prev) => prev.map((name, i) => (i === index ? next : name)));
    }
  }

  function chooseTennisFormat(next: TennisFormat) {
    setTennisFormat(next);
    setTennisSets((prev) => {
      const filled = prev.slice(0, next);
      while (filled.length < next) filled.push({ winner: '', loser: '' });
      return filled;
    });
  }

  function updateTennisSet(index: number, side: 'winner' | 'loser', value: string) {
    setTennisSets((prev) =>
      prev.map((set, i) => (i === index ? { ...set, [side]: value.replace(/[^\d]/g, '') } : set)),
    );
  }

  async function handleSubmit() {
    if (!token) {
      setError('Your session expired. Sign out and sign in again.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const payload: {
        winners: string[];
        losers: string[];
        winner_score?: number;
        loser_score?: number;
        game_date?: string;
        metadata?: Record<string, unknown>;
      } = {
        winners: winnerNames.map((n) => n.trim()),
        losers: loserNames.map((n) => n.trim()),
        game_date: formatLocalDateTime(playedAt),
      };
      if (tennis) {
        const tennisScore = tennisScorePayload(tennisSets, tennisFormat);
        payload.winner_score = tennisScore.winner_score;
        payload.loser_score = tennisScore.loser_score;
        payload.metadata = tennisScore.metadata;
      } else if (!winLoss) {
        payload.winner_score = Number(winnerScore);
        payload.loser_score = Number(loserScore);
      }
      if (editing && gameId) {
        await api.updateGame(token, gameId, payload);
      } else {
        await api.addGame(token, sportId, payload);
      }
      await rememberPlayers([...payload.winners, ...payload.losers]);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save game');
    } finally {
      setLoading(false);
    }
  }

  function renderNameField(
    side: 'winner' | 'loser',
    label: string,
    index: number,
    value: string,
  ) {
    const focused = focusField && typeof focusField === 'object' && focusField.side === side && focusField.index === index;
    const matches = focused ? suggestionsFor(value) : [];
    return (
      <View key={`${side}-${index}`} style={styles.fieldWrap}>
        <TextInput
          style={styles.input}
          placeholder={label}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
          value={value}
          onFocus={() => setFocusField({ side, index })}
          onChangeText={(next) => updateName(side, index, next)}
        />
        {matches.length > 0 ? (
          <View style={styles.suggestList}>
            {matches.map((name) => (
              <TouchableOpacity
                key={name}
                style={styles.suggestItem}
                onPressIn={() => {
                  updateName(side, index, name);
                  setFocusField(null);
                }}
              >
                <Text style={styles.suggestText}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <ScreenScaffold
      keyboard
      footer={
        <View style={styles.footer}>
          <ErrorBanner message={error} />
          <GradientButton
            label={editing ? 'Save changes' : 'Save game'}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
          />
        </View>
      }
    >
      <ScreenHeader
        title={editing ? 'Edit game' : copyForFocus(focus).addGameTitle}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.subtitle}>{sportName}</Text>
        <DateTimeField value={playedAt} onChange={setPlayedAt} />

        <Text style={styles.section}>
          {teamSides ? 'Winning team' : oneOnOne ? 'Winner' : 'Winners'}
        </Text>
        {winnerLabels.map((label, index) => renderNameField('winner', label, index, winnerNames[index]))}

        <Text style={styles.section}>
          {teamSides ? 'Losing team' : oneOnOne ? 'Loser' : 'Losers'}
        </Text>
        {loserLabels.map((label, index) => renderNameField('loser', label, index, loserNames[index]))}

        {winLoss ? (
          <Text style={styles.hint}>Just who won.</Text>
        ) : tennis ? (
          <View style={styles.tennisBlock}>
            <Text style={styles.section}>Set scores</Text>
            <View style={styles.formatRow}>
              {TENNIS_FORMATS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.formatChip, tennisFormat === option.id && styles.formatChipOn]}
                  onPress={() => chooseTennisFormat(option.id)}
                >
                  <Text style={[styles.formatText, tennisFormat === option.id && styles.formatTextOn]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {tennisSets.map((set, index) => (
              <View key={`set-${index}`} style={styles.scoreRow}>
                <View style={styles.scoreField}>
                  <Text style={styles.label}>Set {index + 1} winner</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={set.winner}
                    onChangeText={(value) => updateTennisSet(index, 'winner', value)}
                  />
                </View>
                <View style={styles.scoreField}>
                  <Text style={styles.label}>Set {index + 1} loser</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={set.loser}
                    onChangeText={(value) => updateTennisSet(index, 'loser', value)}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.scoreRow}>
            <View style={styles.scoreField}>
              <Text style={styles.label}>{teamSides ? 'Winning score' : 'Winner score'}</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={winnerScore}
                onFocus={() => setFocusField('winnerScore')}
                onChangeText={setWinnerScore}
              />
              {winnerHint != null ? (
                <View style={styles.chipRow}>
                  <TouchableOpacity style={styles.scoreChip} onPress={() => setWinnerScore(String(winnerHint))}>
                    <Text style={styles.scoreChipText}>{winnerHint}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            <View style={styles.scoreField}>
              <Text style={styles.label}>{teamSides ? 'Losing score' : 'Loser score'}</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={loserScore}
                onFocus={() => setFocusField('loserScore')}
                onChangeText={setLoserScore}
              />
              {loserHints.length ? (
                <View style={styles.chipRow}>
                  {loserHints.map((score) => (
                    <TouchableOpacity
                      key={score}
                      style={styles.scoreChip}
                      onPress={() => setLoserScore(String(score))}
                    >
                      <Text style={styles.scoreChipText}>{score}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  section: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  label: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  fieldWrap: {
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    fontSize: 16,
    color: colors.text,
    marginBottom: 0,
  },
  suggestList: {
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(191, 219, 254, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.28)',
    overflow: 'hidden',
    zIndex: 2,
  },
  suggestItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(37, 99, 235, 0.14)',
  },
  suggestText: {
    color: colors.text,
    fontWeight: '600',
  },
  hint: {
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  tennisBlock: {
    marginTop: spacing.sm,
  },
  formatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  formatChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.22)',
  },
  formatChipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  formatText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  formatTextOn: {
    color: '#fff',
  },
  scoreField: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  scoreChip: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.28)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreChipText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
