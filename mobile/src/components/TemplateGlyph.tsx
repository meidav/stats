import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { iconForTemplate } from '../lib/templateIcons';
import type { SportTemplate } from '../types';

type GlyphTemplate = Pick<SportTemplate, 'id' | 'category'>;

const FAN = [
  { rank: 'A', suit: 'S', rotate: '-18deg', top: 6, left: 0, z: 1 },
  { rank: 'K', suit: 'H', rotate: '-9deg', top: 3, left: 7, z: 2 },
  { rank: 'Q', suit: 'D', rotate: '0deg', top: 0, left: 14, z: 3 },
  { rank: 'J', suit: 'C', rotate: '9deg', top: 3, left: 21, z: 2 },
  { rank: '10', suit: 'S', rotate: '18deg', top: 6, left: 28, z: 1 },
] as const;

function suitGlyph(suit: string) {
  if (suit === 'H') return { mark: '♥', color: '#E11D48' };
  if (suit === 'D') return { mark: '♦', color: '#E11D48' };
  if (suit === 'C') return { mark: '♣', color: '#0F172A' };
  return { mark: '♠', color: '#0F172A' };
}

function FanHand({ size }: { size: number }) {
  const scale = size / 28;
  return (
    <View style={[styles.fan, { width: 46 * scale, height: 32 * scale }]}>
      {FAN.map((card) => {
        const suit = suitGlyph(card.suit);
        return (
          <View
            key={`${card.rank}${card.suit}`}
            style={[
              styles.card,
              {
                top: card.top * scale,
                left: card.left * scale,
                zIndex: card.z,
                width: 16 * scale,
                height: 22 * scale,
                borderRadius: 3 * scale,
                transform: [{ rotate: card.rotate }],
              },
            ]}
          >
            <Text style={[styles.rank, { color: suit.color, fontSize: 6 * scale }]}>
              {card.rank}
            </Text>
            <Text style={[styles.suit, { color: suit.color, fontSize: 7 * scale }]}>
              {suit.mark}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function isCardTemplate(template: GlyphTemplate) {
  return template.category === 'cards' || template.id === 'uno';
}

export function TemplateGlyph({
  template,
  size = 28,
}: {
  template: GlyphTemplate;
  size?: number;
}) {
  if (isCardTemplate(template)) {
    return <FanHand size={size} />;
  }
  return <Text style={{ fontSize: size, lineHeight: size + 4 }}>{iconForTemplate(template)}</Text>;
}

const styles = StyleSheet.create({
  fan: {
    position: 'relative',
  },
  card: {
    position: 'absolute',
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1,
  },
  rank: {
    fontWeight: '800',
    lineHeight: 8,
  },
  suit: {
    lineHeight: 9,
    marginTop: -1,
  },
});
