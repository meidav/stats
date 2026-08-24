import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

import { colors, spacing } from '../constants/theme';

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

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(91, 33, 182, 0.22)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  disabled: {
    backgroundColor: 'rgba(49, 16, 101, 0.18)',
  },
  label: {
    color: colors.onGlass,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  labelDisabled: {
    color: colors.onGlassMuted,
  },
});
