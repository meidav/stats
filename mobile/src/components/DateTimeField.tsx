import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { spacing } from '../constants/theme';
import { formatPlayedLabel } from '../lib/datetime';
import { formChrome } from '../lib/formTheme';
import { useThemeTokens } from '../lib/theme';

type Props = {
  value: Date;
  onChange: (next: Date) => void;
  onOpenChange?: (open: boolean) => void;
};

export function DateTimeField({ value, onChange, onOpenChange }: Props) {
  const theme = useThemeTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [iosOpen, setIosOpen] = useState(false);
  const [androidMode, setAndroidMode] = useState<'date' | 'time' | null>(null);

  function apply(event: DateTimePickerEvent, next?: Date) {
    if (Platform.OS === 'android') {
      setAndroidMode(null);
      if (event.type !== 'set' || !next) {
        onOpenChange?.(false);
        return;
      }
      if (androidMode === 'date') {
        const merged = new Date(value);
        merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
        onChange(merged);
        setAndroidMode('time');
        return;
      }
      const merged = new Date(value);
      merged.setHours(next.getHours(), next.getMinutes(), 0, 0);
      onChange(merged);
      onOpenChange?.(false);
      return;
    }
    if (next) onChange(next);
  }

  function openPicker() {
    if (Platform.OS === 'android') {
      setAndroidMode('date');
      onOpenChange?.(true);
      return;
    }
    setIosOpen((open) => {
      const next = !open;
      onOpenChange?.(next);
      return next;
    });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Played</Text>
      <TouchableOpacity style={styles.field} onPress={openPicker} activeOpacity={0.85}>
        <Text style={styles.value}>{formatPlayedLabel(value)}</Text>
        <Text style={styles.hint}>{iosOpen ? 'Tap to hide' : 'Tap to change'}</Text>
      </TouchableOpacity>
      {Platform.OS === 'ios' && iosOpen ? (
        <View style={styles.iosPicker}>
          <DateTimePicker
            value={value}
            mode="datetime"
            display="spinner"
            onChange={apply}
            themeVariant={theme.isDark ? 'dark' : 'light'}
          />
        </View>
      ) : null}
      {Platform.OS === 'android' && androidMode ? (
        <DateTimePicker
          value={value}
          mode={androidMode}
          display="default"
          onChange={apply}
        />
      ) : null}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useThemeTokens>) {
  const chrome = formChrome(theme);
  return StyleSheet.create({
    wrap: {
      marginBottom: spacing.md,
    },
    label: {
      fontWeight: '600',
      color: chrome.label,
      marginBottom: spacing.xs,
    },
    field: {
      borderWidth: 1,
      borderColor: chrome.fieldBorder,
      borderRadius: 10,
      padding: spacing.md,
      backgroundColor: chrome.fieldBg,
    },
    value: {
      fontSize: 17,
      fontWeight: '700',
      color: chrome.inputText,
    },
    hint: {
      marginTop: 4,
      fontSize: 13,
      color: chrome.muted,
    },
    iosPicker: {
      marginTop: spacing.sm,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.isDark ? theme.colors.surface : 'rgba(255, 255, 255, 0.45)',
    },
  });
}
