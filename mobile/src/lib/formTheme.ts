import type { AppTheme } from '../constants/theme';

/** Shared field / chip colors so every form matches dark themes. */
export function formChrome(theme: AppTheme) {
  const { colors } = theme;
  return {
    fieldBg: colors.fieldBg,
    fieldBorder: colors.fieldBorder,
    label: colors.text,
    muted: colors.textMuted,
    inputText: colors.text,
    placeholder: theme.isDark ? 'rgba(232,232,232,0.45)' : 'rgba(51, 65, 85, 0.42)',
    chipActiveText: theme.id === 'classic' ? '#121820' : '#fff',
    suggestBg: theme.isDark ? colors.surface : 'rgba(191, 219, 254, 0.92)',
    suggestBorder: theme.isDark ? colors.fieldBorder : 'rgba(99, 102, 241, 0.28)',
    suggestDivider: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(37, 99, 235, 0.14)',
    chipIdleBg: colors.fieldBg,
    chipIdleBorder: colors.fieldBorder,
    scoreChipBg: theme.isDark ? 'rgba(255,255,255,0.08)' : `${colors.primary}1F`,
    scoreChipBorder: theme.isDark ? colors.fieldBorder : `${colors.primary}47`,
    scoreChipText: theme.isDark ? colors.primary : colors.primaryDark,
    selectedBg: theme.isDark ? 'rgba(255,255,255,0.1)' : `${colors.primary}22`,
  };
}
