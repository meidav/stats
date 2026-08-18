import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ErrorBanner } from '../components/ErrorBanner';
import { GradientButton } from '../components/GradientButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { colors, spacing } from '../constants/theme';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { LEAGUE_ICONS } from '../lib/leagueIcons';
import { LeagueIcon } from '../components/LeagueIcon';
import { upsertCachedLeague } from '../lib/leagueCache';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditLeague'>;

export function EditLeagueScreen({ route, navigation }: Props) {
  const { slug, name: initialName, icon: initialIcon } = route.params;
  const { token } = useAuth();
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState<string | null>(initialIcon ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!token) {
      setError('Your session expired. Sign out and sign in again.');
      return;
    }
    if (!name.trim()) {
      setError('Add a name to continue.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const league = await api.updateLeague(token, slug, {
        name: name.trim(),
        icon,
      });
      await upsertCachedLeague(league);
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save league');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenScaffold
      keyboard
      footer={
        <View style={styles.footer}>
          <ErrorBanner message={error} />
          <GradientButton label="Save" onPress={handleSave} loading={loading} disabled={loading} />
        </View>
      }
    >
      <ScreenHeader title="Edit league" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          autoCapitalize="words"
          onChangeText={setName}
        />

        <Text style={styles.label}>Icon</Text>
        <Text style={styles.hint}>A custom upload comes later. Pick one of these for now.</Text>
        <View style={styles.grid}>
          {LEAGUE_ICONS.map((item) => {
            const selected = icon === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.iconCell, selected && styles.iconCellActive]}
                onPress={() => setIcon(selected ? null : item.id)}
              >
                <LeagueIcon id={item.id} size={26} />
              </TouchableOpacity>
            );
          })}
        </View>
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
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    fontSize: 16,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconCell: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  iconCellActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.16)',
  },
});
