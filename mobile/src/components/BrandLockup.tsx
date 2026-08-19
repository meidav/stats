import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

import { PlayTrackerLogo } from './PlayTrackerLogo';

type Props = {
  size?: number;
  style?: ViewStyle;
};

export function BrandLockup({ size = 148, style }: Props) {
  return (
    <LinearGradient
      colors={['#3B0764', '#5B21B6', '#6D28D9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      <PlayTrackerLogo size={size} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#2E1065',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});
