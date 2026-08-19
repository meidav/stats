import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '../constants/theme';
import { formatPlayedLabel } from '../lib/datetime';

type Props = {
  value: Date;
  onChange: (next: Date) => void;
};

export function DateTimeField({ value, onChange }: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [androidMode, setAndroidMode] = useState<'date' | 'time' | null>(null);

  function apply(event: DateTimePickerEvent, next?: Date) {
    if (Platform.OS === 'android') {
      setAndroidMode(null);
      if (event.type !== 'set' || !next) return;
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
      return;
    }
    if (next) onChange(next);
  }

  function openPicker() {
    if (Platform.OS === 'android') {
      setAndroidMode('date');
      return;
    }
    setIosOpen((open) => !open);
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
            themeVariant="light"
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

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  value: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  hint: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
  iosPicker: {
    marginTop: spacing.sm,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
});
