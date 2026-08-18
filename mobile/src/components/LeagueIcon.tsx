import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { glyphForIcon, kindForIcon } from '../lib/leagueIcons';
import {
  BeachVolleyballMark,
  CheckerGlyph,
  ChessKingGlyph,
  FanHand,
} from './TemplateGlyph';

export function LeagueIcon({ id, size = 26 }: { id?: string | null; size?: number }) {
  const kind = kindForIcon(id);
  if (kind === 'cards') {
    return <FanHand size={Math.max(18, size - 4)} />;
  }
  if (kind === 'beach') {
    return <BeachVolleyballMark size={size + 6} />;
  }
  if (kind === 'checker') {
    return <CheckerGlyph size={size} />;
  }
  if (kind === 'chess') {
    return <ChessKingGlyph size={size} />;
  }
  const glyph = glyphForIcon(id);
  if (!glyph) return null;
  return <Text style={[styles.glyph, { fontSize: size, lineHeight: size + 4 }]}>{glyph}</Text>;
}

const styles = StyleSheet.create({
  glyph: {
    textAlign: 'center',
  },
});
