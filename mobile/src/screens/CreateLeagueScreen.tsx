import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { TemplateGlyph } from '../components/TemplateGlyph';
import { colors, spacing } from '../constants/theme';
import { copyForFocus, defaultTemplateId, detectTemplateFromName, FOCUS_OPTIONS, templatesForFocus } from '../lib/focus';
import { upsertCachedLeague } from '../lib/leagueCache';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
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
  const scrollRef = useRef<ScrollView>(null);
  const nameY = useRef(0);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [focus, setFocus] = useState<LeagueFocus>('sports');
  const [templates, setTemplates] = useState<SportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('beach_volleyball_2s');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState(false);
  const pickedTemplate = useRef(false);

  useEffect(() => {
    api.getTemplates().then((result) => setTemplates(result.templates));
  }, []);

  const visibleTemplates = useMemo(() => {
    const visible = templatesForFocus(templates, focus);
    const selected = templates.find((template) => template.id === selectedTemplate);
    if (selected && !visible.some((template) => template.id === selected.id)) {
      return [selected, ...visible];
    }
    return visible;
  }, [templates, focus, selectedTemplate]);
  const copy = copyForFocus(focus);

  function handleFocusChange(next: LeagueFocus) {
    setFocus(next);
    const visible = templatesForFocus(templates, next);
    if (visible.some((template) => template.id === selectedTemplate)) {
      return;
    }
    const detected = detectTemplateFromName(name, templates);
    if (detected && visible.some((template) => template.id === detected)) {
      setSelectedTemplate(detected);
      return;
    }
    setSelectedTemplate(defaultTemplateId(templates, next));
  }

  function applyName(value: string) {
    setName(value);
    if (nameError && value.trim()) {
      setNameError(false);
      setError('');
    }
    if (pickedTemplate.current) return;
    const detected = detectTemplateFromName(value, templates);
    if (detected) {
      setSelectedTemplate(detected);
    }
  }

  function showNameError() {
    setNameError(true);
    setError('Add a name to continue.');
    scrollRef.current?.scrollTo({ y: Math.max(nameY.current - 24, 0), animated: true });
  }

  async function handleCreate() {
    if (!token) {
      setError('Your session expired. Sign out and sign in again.');
      return;
    }
    if (!name.trim()) {
      showNameError();
      return;
    }

    setLoading(true);
    setError('');
    setNameError(false);
    try {
      const league = await api.createLeague(token, {
        name: name.trim(),
        visibility,
        focus,
        sport_template_id: selectedTemplate,
      });
      await upsertCachedLeague(league);
      navigation.replace('League', { slug: league.slug, name: league.name });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create league');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenScaffold
      keyboard
      footer={
        <View style={styles.footer}>
          <ErrorBanner message={!nameError ? error : ''} />
          <GradientButton label="Create league" onPress={handleCreate} loading={loading} disabled={loading} />
        </View>
      }
    >
      <ScreenHeader title={copy.createTitle} onBack={() => navigation.goBack()} />
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
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

        <View
          onLayout={(event) => {
            nameY.current = event.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={[styles.input, nameError && styles.inputError]}
            placeholder={focus === 'table' ? 'Sunday game night' : 'Tuesday Night Crew'}
            placeholderTextColor={nameError ? colors.danger : colors.textMuted}
            autoCapitalize="words"
            value={name}
            onChangeText={applyName}
          />
          {nameError ? <Text style={styles.fieldError}>Name is required.</Text> : null}
        </View>

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
        <View style={styles.grid}>
          {visibleTemplates.map((template) => {
            const selected = selectedTemplate === template.id;
            return (
              <TouchableOpacity
                key={template.id}
                style={[styles.template, selected && styles.templateActive]}
                onPress={() => {
                  pickedTemplate.current = true;
                  setSelectedTemplate(template.id);
                }}
              >
                <View style={styles.templateInner}>
                  <TemplateGlyph template={template} size={26} />
                  <Text style={styles.templateName} numberOfLines={2}>
                    {template.name}
                  </Text>
                </View>
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
    marginTop: spacing.xs,
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
  inputError: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  fieldError: {
    color: colors.danger,
    marginTop: spacing.xs,
    fontSize: 13,
    fontWeight: '600',
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
  template: {
    width: '47%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    minHeight: 64,
    justifyContent: 'flex-end',
  },
  templateActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  templateInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateName: {
    flex: 1,
    fontWeight: '700',
    color: colors.text,
    fontSize: 13,
    lineHeight: 16,
  },
});
