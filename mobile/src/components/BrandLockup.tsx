import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  size?: number;
  style?: ViewStyle;
  /** Kept for callers; rebrand ships PNG only. */
  mode?: 'svg' | 'image';
};

const logoPng = require('../../assets/playtracker-logo.png');

/**
 * Stacked lockup on the brand dark purple ramp (matches splash / store icon).
 * Logo PNG includes some empty canvas; scale art slightly so it fills the tile.
 */
const ART_SCALE = 0.92;

export function BrandLockup({ size = 148, style }: Props) {
  const art = Math.round(size * ART_SCALE);
  return (
    <LinearGradient
      colors={['#36048E', '#100246', '#000012']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.card, { width: size, height: size, borderRadius: Math.max(18, size * 0.2) }, style]}
    >
      <View style={styles.art} pointerEvents="none">
        <Image source={logoPng} style={{ width: art, height: art }} resizeMode="contain" />
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
    borderColor: 'rgba(196, 181, 253, 0.28)',
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
