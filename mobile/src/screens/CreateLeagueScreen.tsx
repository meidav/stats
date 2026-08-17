import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
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
import { copyForFocus, defaultTemplateId, FOCUS_OPTIONS, templatesForFocus } from '../lib/focus';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import type { LeagueFocus } from '../lib/focus';
import type { SportTemplate } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateLeague'>;

const VISIBILITY_OPTIONS = [
  { id: 'public', label: 'Public' },
  { id: 'unlisted', label: 'Unlisted' },
  { id: 'private', label: 'Private' },
] as const;

export function CreateLeagueScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [focus, setFocus] = useState<LeagueFocus>('sports');
  const [templates, setTemplates] = useState<SportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('beach_volleyball_2s');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getTemplates().then((result) => setTemplates(result.templates));
  }, []);

  const visibleTemplates = useMemo(
    () => templatesForFocus(templates, focus),
    [templates, focus],
  );
  const copy = copyForFocus(focus);

  function handleFocusChange(next: LeagueFocus) {
    setFocus(next);
    setSelectedTemplate(defaultTemplateId(templates, next));
  }

  async function handleCreate() {
    if (!token || !name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const league = await api.createLeague(token, {
        name: name.trim(),
        visibility,
        focus,
        sport_template_id: selectedTemplate,
      });
      navigation.replace('League', { slug: league.slug, name: league.name });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create league');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{copy.createTitle}</Text>

      <Text style={styles.label}>What do you play?</Text>
      <View style={styles.row}>
        {FOCUS_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.chip, focus === option.id && styles.chipActive]}
            onPress={() => handleFocusChange(option.id)}
          >
            <Text style={[styles.chipText, focus === option.id && styles.chipTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.hint}>{FOCUS_OPTIONS.find((option) => option.id === focus)?.hint}</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder={focus === 'table' ? 'Sunday game night' : 'Tuesday Night Crew'}
        value={name}
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

      <Text style={styles.label}>{copy.firstGameLabel}</Text>
      {visibleTemplates.map((template) => (
        <TouchableOpacity
          key={template.id}
          style={[styles.template, selectedTemplate === template.id && styles.templateActive]}
          onPress={() => setSelectedTemplate(template.id)}
        >
          <Text style={styles.templateName}>{template.name}</Text>
          <Text style={styles.templateMeta}>
            {template.category === 'custom' ? 'Your rules' : template.category}
            {' · '}
            {template.score_mode === 'win_loss' ? 'win / loss' : template.score_direction.replace('_', ' ')}
          </Text>
        </TouchableOpacity>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Create</Text>
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
    marginBottom: spacing.lg,
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
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
  template: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  templateActive: {
    borderColor: colors.primary,
    backgroundColor: '#ECFDF5',
  },
  templateName: {
    fontWeight: '700',
    color: colors.text,
  },
  templateMeta: {
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 13,
    textTransform: 'capitalize',
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
