import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';

import { PlayTrackerLogo } from './PlayTrackerLogo';

type Props = {
  size?: number;
  style?: ViewStyle;
  /** Prefer PNG on the critical boot path; SVG elsewhere. */
  mode?: 'svg' | 'image';
};

const logoPng = require('../../assets/playtracker-logo.png');

/**
 * Logo SVG includes empty canvas margin. Scale art a bit above the tile so the
 * pawn + wordmark read larger, while still leaving a little edge padding.
 */
const ART_SCALE = 1.18;

export function BrandLockup({ size = 148, style, mode = 'svg' }: Props) {
  const art = Math.round(size * ART_SCALE);
  return (
    <LinearGradient
      colors={['#3B0764', '#5B21B6', '#6D28D9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { width: size, height: size, borderRadius: Math.max(18, size * 0.2) }, style]}
    >
      <View style={styles.art} pointerEvents="none">
        {mode === 'image' ? (
          <Image source={logoPng} style={{ width: art, height: art }} resizeMode="contain" />
        ) : (
          <PlayTrackerLogo size={art} />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.35)',
    shadowColor: '#2E1065',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  art: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
