import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, ViewStyle } from 'react-native';

import { useIsTablet } from '../lib/layout';

type Props = {
  count: number;
  style?: ViewStyle;
};

/** Padding for the badge parent so FlatList / overflow does not clip the corner chip. */
export const gamesBadgeRoom = {
  paddingTop: 10,
  paddingRight: 8,
} as const;

export const gamesBadgeRoomTablet = {
  paddingTop: 12,
  paddingRight: 10,
} as const;

/**
 * Corner badge showing how many games a league has.
 * Parent must include gamesBadgeRoom padding so the chip is not clipped.
 */
export function GamesCountBadge({ count, style }: Props) {
  const isTablet = useIsTablet();
  const gamesLabel = count === 1 ? '1 game' : `${count} games`;

  return (
    <LinearGradient
      colors={
        count === 0
          ? (['#A8A29E', '#78716C'] as const)
          : (['#A78BFA', '#7C3AED'] as const)
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, isTablet && styles.badgeTablet, style]}
      accessibilityLabel={gamesLabel}
    >
      <Text style={[styles.text, isTablet && styles.textTablet]}>{count}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 252, 248, 0.95)',
    shadowColor: '#5B21B6',
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  badgeTablet: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderWidth: 2.5,
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: 13,
  },
  textTablet: {
    fontSize: 14,
    lineHeight: 17,
  },
});
