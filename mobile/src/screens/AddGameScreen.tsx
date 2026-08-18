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

import { ErrorBanner } from '../components/ErrorBanner';
import { GradientButton } from '../components/GradientButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { colors, spacing } from '../constants/theme';
import { copyForFocus } from '../lib/focus';
import { autoCapWords } from '../lib/names';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { loadCachedLeagues } from '../lib/leagueCache';
import { loadCachedPlayers, rememberPlayers } from '../lib/playerCache';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddGame'>;
type FocusField = { side: 'winner' | 'loser'; index: number } | 'winnerScore' | 'loserScore' | null;

export function AddGameScreen({ route, navigation }: Props) {
  const {
    sportId,
    sportName,
    playersPerSide,
    scoreMode = 'points',
    focus = 'mixed',
  } = route.params;
  const { token } = useAuth();
  const winLoss = scoreMode === 'win_loss';
  const oneOnOne = playersPerSide === 1;
  const [winnerNames, setWinnerNames] = useState<string[]>(
    Array.from({ length: playersPerSide }, () => ''),
  );
  const [loserNames, setLoserNames] = useState<string[]>(
    Array.from({ length: playersPerSide }, () => ''),
  );
  const [winnerScore, setWinnerScore] = useState('');
  const [loserScore, setLoserScore] = useState('');
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
            api.getSportStats(sport.id, token, 1).catch(() => ({ stats: [] as Array<{ player: string }> })),
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
      Array.from({ length: playersPerSide }, (_, i) =>
        oneOnOne ? 'Winner' : `Winner ${i + 1}`,
      ),
    [playersPerSide, oneOnOne],
  );
  const loserLabels = useMemo(
    () =>
      Array.from({ length: playersPerSide }, (_, i) =>
        oneOnOne ? 'Loser' : `Loser ${i + 1}`,
      ),
    [playersPerSide, oneOnOne],
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
      } = {
        winners: winnerNames.map((n) => n.trim()),
        losers: loserNames.map((n) => n.trim()),
      };
      if (!winLoss) {
        payload.winner_score = Number(winnerScore);
        payload.loser_score = Number(loserScore);
      }
      await api.addGame(token, sportId, payload);
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
          <GradientButton label="Save game" onPress={handleSubmit} loading={loading} disabled={loading} />
        </View>
      }
    >
      <ScreenHeader title={copyForFocus(focus).addGameTitle} onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.subtitle}>{sportName}</Text>

        <Text style={styles.section}>{oneOnOne ? 'Winner' : 'Winners'}</Text>
        {winnerLabels.map((label, index) => renderNameField('winner', label, index, winnerNames[index]))}

        <Text style={styles.section}>{oneOnOne ? 'Loser' : 'Losers'}</Text>
        {loserLabels.map((label, index) => renderNameField('loser', label, index, loserNames[index]))}

        {winLoss ? (
          <Text style={styles.hint}>Just who won.</Text>
        ) : (
          <View style={styles.scoreRow}>
            <View style={styles.scoreField}>
              <Text style={styles.label}>Winner score</Text>
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
              <Text style={styles.label}>Loser score</Text>
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
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.22)',
    overflow: 'hidden',
    zIndex: 2,
  },
  suggestItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
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
