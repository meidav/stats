import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

import { glass } from '../constants/theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
};

export function GlassCard({ children, style, onPress }: Props) {
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: glass.backgroundColor,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: glass.borderColor,
    shadowColor: glass.shadowColor,
    shadowOpacity: glass.shadowOpacity,
    shadowRadius: glass.shadowRadius,
    shadowOffset: glass.shadowOffset,
    elevation: glass.elevation,
  },
});
