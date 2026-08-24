import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { gradients } from '../constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GradientButton({ label, onPress, disabled, loading, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.touchable, (disabled || loading) && styles.disabled, style]}
    >
      <LinearGradient
        colors={[...gradients.button]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {label}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.7,
  },
  gradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
