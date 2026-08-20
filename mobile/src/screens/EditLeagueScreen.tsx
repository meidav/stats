import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ErrorBanner } from '../components/ErrorBanner';
import { GradientButton } from '../components/GradientButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { colors, spacing } from '../constants/theme';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { iconIdForSport, LEAGUE_ICONS, selectedIconForLeague, sortLeagueIcons, type LeagueIconUsage } from '../lib/leagueIcons';
import { LeagueIcon } from '../components/LeagueIcon';
import { upsertCachedLeague } from '../lib/leagueCache';
import { hintForVisibility, VISIBILITY_OPTIONS, type LeagueVisibility } from '../lib/visibility';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditLeague'>;

function iconFromParams(params: RootStackParamList['EditLeague']) {
  if (params.icon && LEAGUE_ICONS.some((item) => item.id === params.icon)) {
    return params.icon;
  }
  if (params.sportTemplateId) {
    return iconIdForSport({ template_id: params.sportTemplateId });
  }
  return null;
}

export function EditLeagueScreen({ route, navigation }: Props) {
  const { slug, name: initialName, visibility: initialVisibility, icon: paramIcon, sportTemplateId } =
    route.params;
  const { token } = useAuth();
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState<string | null>(() => iconFromParams(route.params));
  const [visibility, setVisibility] = useState<LeagueVisibility>(initialVisibility ?? 'public');
  const [iconUsage, setIconUsage] = useState<LeagueIconUsage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        api.getLeagueIconUsage().then((usage) => {
          if (active) setIconUsage(usage);
        }).catch(() => {});

        if (!token) return;
        try {
          const league = await api.getLeague(slug, token);
          if (!active) return;
          setName(league.name);
          setVisibility(league.visibility);
          setIcon(selectedIconForLeague(league));
        } catch {
          if (!active) return;
          if (paramIcon && LEAGUE_ICONS.some((item) => item.id === paramIcon)) {
            setIcon(paramIcon);
          } else if (sportTemplateId) {
            setIcon(iconIdForSport({ template_id: sportTemplateId }));
          }
        }
      }
      load();
      return () => {
        active = false;
      };
    }, [slug, token, paramIcon, sportTemplateId]),
  );

  const icons = useMemo(() => sortLeagueIcons(iconUsage), [iconUsage]);

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
        visibility,
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

        <Text style={styles.label}>Visibility</Text>
        <View style={styles.row}>
          {VISIBILITY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.chip, visibility === option.id && styles.chipActive]}
              onPress={() => setVisibility(option.id)}
            >
              <Text style={[styles.chipText, visibility === option.id && styles.chipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>{hintForVisibility(visibility)}</Text>

        <Text style={styles.label}>Icon</Text>
        <Text style={styles.hint}>A custom upload comes later. Pick one of these for now.</Text>
        <View style={styles.grid}>
          {icons.map((item) => {
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
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  chip: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
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
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  iconCellActive: {
    borderColor: colors.primary,
    borderWidth: 3,
    backgroundColor: 'rgba(37, 99, 235, 0.28)',
  },
});
