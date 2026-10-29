import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

import { useThemeTokens } from '../lib/theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function GlassCard({ children, style, onPress }: Props) {
  const theme = useThemeTokens();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

function makeStyles(theme: ReturnType<typeof useThemeTokens>) {
  const g = theme.glassLight;
  return StyleSheet.create({
    card: {
      backgroundColor: g.backgroundColor,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: g.borderColor,
      shadowColor: g.shadowColor,
      shadowOpacity: g.shadowOpacity,
      shadowRadius: g.shadowRadius,
      shadowOffset: g.shadowOffset,
      elevation: g.elevation,
    },
  });
}
