import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { SvgXml } from 'react-native-svg';

import { colors } from '../constants/theme';

const GOOGLE_SVG = `
<svg width="20" height="20" viewBox="0 0 20 20">
  <g>
    <path fill="#4285F4" d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.48c-.24 1.28-.97 2.36-2.07 3.08v2.56h3.35c1.96-1.81 3.09-4.48 3.09-7.43z"></path>
    <path fill="#34A853" d="M10 20c2.7 0 4.97-.9 6.63-2.43l-3.35-2.56c-.93.62-2.12.99-3.28.99-2.52 0-4.66-1.7-5.42-3.99H1.13v2.5C2.86 17.98 6.18 20 10 20z"></path>
    <path fill="#FBBC05" d="M4.58 12.01A5.99 5.99 0 0 1 4 10c0-.7.12-1.39.33-2.01V5.49H1.13A9.98 9.98 0 0 0 0 10c0 1.64.39 3.19 1.13 4.51l3.45-2.5z"></path>
    <path fill="#EA4335" d="M10 4.01c1.47 0 2.8.51 3.84 1.51l2.88-2.88C14.97 1.09 12.7 0 10 0 6.18 0 2.86 2.02 1.13 5.49l3.45 2.5C5.34 5.71 7.48 4.01 10 4.01z"></path>
  </g>
</svg>
`;

export function GoogleLogo({ size = 20 }: { size?: number }) {
  return <SvgXml xml={GOOGLE_SVG} width={size} height={size} />;
}

export function AppleLogo({ size = 20, color = '#fff' }: { size?: number; color?: string }) {
  return <Ionicons name="logo-apple" size={size} color={color} />;
}

export const icons = {
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',
  apple: 'logo-apple',
  skip: 'play-skip-forward-outline',
  back: 'chevron-back',
  next: 'chevron-forward',
  trophy: 'trophy-outline',
  dice: 'dice-outline',
  people: 'people-outline',
} as const;

export type AppIcon = (typeof icons)[keyof typeof icons];

export function AppIcon({
  name,
  size = 20,
  color = colors.textMuted,
}: {
  name: AppIcon;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
