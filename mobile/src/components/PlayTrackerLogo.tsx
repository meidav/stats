import React from 'react';
import { SvgXml } from 'react-native-svg';

import { PLAYTRACKER_LOGO_SVG } from './playtrackerLogoXml';

export function PlayTrackerLogo({ size = 160 }: { size?: number }) {
  return <SvgXml xml={PLAYTRACKER_LOGO_SVG} width={size} height={size} />;
}
