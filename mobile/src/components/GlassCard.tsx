import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

import { glassLight } from '../constants/theme';

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
    backgroundColor: glassLight.backgroundColor,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: glassLight.borderColor,
    shadowColor: glassLight.shadowColor,
    shadowOpacity: glassLight.shadowOpacity,
    shadowRadius: glassLight.shadowRadius,
    shadowOffset: glassLight.shadowOffset,
    elevation: glassLight.elevation,
  },
});
