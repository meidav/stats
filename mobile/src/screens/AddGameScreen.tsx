import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, spacing } from '../constants/theme';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddGame'>;

export function AddGameScreen({ route, navigation }: Props) {
  const { sportId, sportName, playersPerSide } = route.params;
  const { token } = useAuth();
  const [winnerNames, setWinnerNames] = useState<string[]>(
    Array.from({ length: playersPerSide }, () => ''),
  );
  const [loserNames, setLoserNames] = useState<string[]>(
    Array.from({ length: playersPerSide }, () => ''),
  );
  const [winnerScore, setWinnerScore] = useState('');
  const [loserScore, setLoserScore] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const winnerLabels = useMemo(
    () => Array.from({ length: playersPerSide }, (_, i) => `Winner ${i + 1}`),
    [playersPerSide],
  );
  const loserLabels = useMemo(
    () => Array.from({ length: playersPerSide }, (_, i) => `Loser ${i + 1}`),
    [playersPerSide],
  );

  function updateName(
    side: 'winner' | 'loser',
    index: number,
    value: string,
  ) {
    if (side === 'winner') {
      setWinnerNames((prev) => prev.map((name, i) => (i === index ? value : name)));
    } else {
      setLoserNames((prev) => prev.map((name, i) => (i === index ? value : name)));
    }
  }

  async function handleSubmit() {
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      await api.addGame(token, sportId, {
        winners: winnerNames.map((n) => n.trim()),
        losers: loserNames.map((n) => n.trim()),
        winner_score: Number(winnerScore),
        loser_score: Number(loserScore),
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save game');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add Game</Text>
      <Text style={styles.subtitle}>{sportName}</Text>

      <Text style={styles.section}>Winners</Text>
      {winnerLabels.map((label, index) => (
        <TextInput
          key={`w-${index}`}
          style={styles.input}
          placeholder={label}
          value={winnerNames[index]}
          onChangeText={(value) => updateName('winner', index, value)}
        />
      ))}

      <Text style={styles.section}>Losers</Text>
      {loserLabels.map((label, index) => (
        <TextInput
          key={`l-${index}`}
          style={styles.input}
          placeholder={label}
          value={loserNames[index]}
          onChangeText={(value) => updateName('loser', index, value)}
        />
      ))}

      <View style={styles.scoreRow}>
        <View style={styles.scoreField}>
          <Text style={styles.label}>Winner score</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={winnerScore}
            onChangeText={setWinnerScore}
          />
        </View>
        <View style={styles.scoreField}>
          <Text style={styles.label}>Loser score</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={loserScore}
            onChangeText={setLoserScore}
          />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Game</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.surface,
    fontSize: 16,
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
  },
});
