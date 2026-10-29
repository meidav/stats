import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

import { spacing } from '../constants/theme';
import { useThemeTokens } from '../lib/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children?: React.ReactNode;
};

/**
 * App-wide secondary CTA: soft fill, no border (same look as intro Previous).
 */
export function SecondaryButton({
  label,
  onPress,
  disabled,
  style,
  accessibilityLabel,
  children,
}: Props) {
  const theme = useThemeTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={[styles.button, disabled && styles.disabled, style]}
    >
      {children}
      <Text
        style={[styles.label, disabled && styles.labelDisabled]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function makeStyles(theme: ReturnType<typeof useThemeTokens>) {
  const { colors } = theme;
  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      backgroundColor: theme.isDark
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(91, 33, 182, 0.42)',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 52,
    },
    disabled: {
      backgroundColor: theme.isDark
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(49, 16, 101, 0.3)',
    },
    label: {
      color: theme.isDark ? colors.text : colors.onGlass,
      fontSize: 16,
      fontWeight: '700',
      flexShrink: 1,
    },
    labelDisabled: {
      color: colors.textMuted,
    },
  });
}
