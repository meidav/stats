import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
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
import { spacing } from '../constants/theme';
import { copyForFocus, defaultTemplateId, detectTemplateFromName, FOCUS_OPTIONS, templatesForFocus } from '../lib/focus';
import { upsertCachedLeague } from '../lib/leagueCache';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { LeagueFocus } from '../lib/focus';
import { suggestLeagueName } from '../lib/names';
import { formChrome } from '../lib/formTheme';
import { useThemeTokens } from '../lib/theme';
import { hintForVisibility, VISIBILITY_OPTIONS, type LeagueVisibility } from '../lib/visibility';
import type { SportTemplate } from '../types';
import type { MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'CreateLeague'>;

export function CreateLeagueScreen({ navigation }: Props) {
  const theme = useThemeTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const chrome = useMemo(() => formChrome(theme), [theme]);
  const { token, user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const nameY = useRef(0);
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<LeagueVisibility>('public');
  const [focus, setFocus] = useState<Exclude<LeagueFocus, 'mixed'>>('sports');
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
  const selectedTemplateMeta = templates.find((template) => template.id === selectedTemplate);
  const namePlaceholder = useMemo(
    () => suggestLeagueName(user, selectedTemplateMeta?.name || selectedTemplateMeta?.default_name),
    [user, selectedTemplateMeta],
  );
  const placeholderColor = chrome.placeholder;
  const placeholderError = theme.isDark ? 'rgba(248,113,113,0.7)' : 'rgba(220, 38, 38, 0.55)';

  function handleFocusChange(next: Exclude<LeagueFocus, 'mixed'>) {
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
      navigation.navigate('Home', {
        screen: 'League',
        params: { slug: league.slug, name: league.name },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create league');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenScaffold
      edgeHeader
      keyboard
      aboveTabBar
      footer={
        <View style={styles.footer}>
          <ErrorBanner message={!nameError ? error : ''} />
          <GradientButton label="Create league" onPress={handleCreate} loading={loading} disabled={loading} />
        </View>
      }
    >
      <ScreenHeader title={copy.createTitle} />
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
            placeholder={namePlaceholder}
            placeholderTextColor={nameError ? placeholderError : placeholderColor}
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
        <Text style={styles.hint}>{hintForVisibility(visibility)}</Text>

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
                  <View style={styles.templateIcon}>
                    <TemplateGlyph template={template} size={28} />
                  </View>
                  <Text
                    style={[styles.templateName, selected && styles.templateNameActive]}
                    numberOfLines={2}
                  >
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

function makeStyles(theme: ReturnType<typeof useThemeTokens>) {
  const { colors } = theme;
  const chrome = formChrome(theme);

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg + 100,
    },
    footer: {
      paddingHorizontal: spacing.lg,
    },
    label: {
      fontSize: 14,
      fontWeight: '700',
      color: chrome.label,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    hint: {
      color: chrome.muted,
      fontSize: 13,
      marginTop: spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: chrome.fieldBorder,
      borderRadius: 10,
      padding: spacing.md,
      backgroundColor: chrome.fieldBg,
      fontSize: 16,
      color: chrome.inputText,
    },
    inputError: {
      borderColor: colors.danger,
      backgroundColor: theme.isDark ? 'rgba(220, 38, 38, 0.16)' : 'rgba(220, 38, 38, 0.08)',
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
      borderColor: chrome.chipIdleBorder,
      backgroundColor: chrome.chipIdleBg,
      alignItems: 'center',
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      color: chrome.label,
      fontWeight: '600',
      fontSize: 13,
    },
    chipTextActive: {
      color: chrome.chipActiveText,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    template: {
      flexGrow: 1,
      flexBasis: '46%',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: chrome.fieldBorder,
      backgroundColor: chrome.fieldBg,
      minHeight: 64,
      justifyContent: 'center',
    },
    templateActive: {
      borderColor: colors.primary,
      backgroundColor: chrome.selectedBg,
    },
    templateInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    templateIcon: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    templateName: {
      flex: 1,
      fontWeight: '700',
      color: chrome.label,
      fontSize: 13,
      lineHeight: 16,
    },
    templateNameActive: {
      color: chrome.label,
    },
  });
}
