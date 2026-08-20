import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, spacing } from '../constants/theme';

export type YearOption = {
  year: string;
  games: number;
};

type Props = {
  years: YearOption[];
  selectedYear: string | null;
  totalGames: number;
  onSelect: (year: string | null) => void;
};

export function YearFilterRow({ years, selectedYear, totalGames, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  if (years.length <= 1) {
    return null;
  }

  const selected = years.find((item) => item.year === selectedYear);
  const label = selected ? selected.year : 'All time';
  const count = selected ? selected.games : totalGames;

  function choose(year: string | null) {
    setOpen(false);
    onSelect(year);
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        accessibilityLabel="Choose year"
        accessibilityRole="button"
      >
        <Text style={styles.triggerLabel}>{label}</Text>
        <Text style={styles.triggerCount}>{count}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.primaryDark} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}}>
            <LinearGradient
              colors={['#BFDBFE', '#DDD6FE', '#FDBA74']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sheet}
            >
            <Text style={styles.sheetTitle}>Standings year</Text>
            {years.map((item) => {
              const active = selectedYear === item.year;
              return (
                <TouchableOpacity
                  key={item.year}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => choose(item.year)}
                >
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {item.year}
                  </Text>
                  <Text style={[styles.optionCount, active && styles.optionCountActive]}>
                    {item.games}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <View style={styles.divider} />
            <TouchableOpacity
              style={[styles.option, selectedYear === null && styles.optionActive]}
              onPress={() => choose(null)}
            >
              <Text style={[styles.optionLabel, selectedYear === null && styles.optionLabelActive]}>
                All time
              </Text>
              <Text style={[styles.optionCount, selectedYear === null && styles.optionCountActive]}>
                {totalGames}
              </Text>
            </TouchableOpacity>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
    alignItems: 'center',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.28)',
  },
  triggerLabel: {
    fontWeight: '800',
    fontSize: 15,
    color: colors.text,
  },
  triggerCount: {
    fontWeight: '800',
    fontSize: 12,
    color: colors.primaryDark,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    borderRadius: 18,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.18)',
    overflow: 'hidden',
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  optionActive: {
    backgroundColor: colors.primary,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  optionLabelActive: {
    color: '#fff',
  },
  optionCount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  optionCountActive: {
    color: '#fff',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15, 23, 42, 0.14)',
    marginVertical: spacing.xs,
    marginHorizontal: spacing.sm,
  },
});
