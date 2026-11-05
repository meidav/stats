import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const logoPng = require('../../assets/playtracker-logo.png');

/** Stacked PlayTracker lockup (PNG). Prefer BrandLockup for the framed welcome tile. */
export function PlayTrackerLogo({
  size = 160,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={logoPng}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="PlayTracker"
    />
  );
}
