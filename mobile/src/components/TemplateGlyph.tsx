import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { iconForTemplate } from '../lib/templateIcons';
import type { SportTemplate } from '../types';

type GlyphTemplate = Pick<SportTemplate, 'id' | 'category'>;

const beachBall = require('../../assets/beach-volleyball.png');

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

export function FanHand({ size }: { size: number }) {
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

export function CheckerGlyph({ size }: { size: number }) {
  const inner = size * 0.68;
  const core = size * 0.22;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#DC2626',
        borderWidth: Math.max(1, size * 0.06),
        borderColor: '#9F1239',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          borderWidth: Math.max(1.5, size * 0.08),
          borderColor: 'rgba(255, 228, 230, 0.7)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: core,
            height: core,
            borderRadius: core / 2,
            backgroundColor: 'rgba(255, 255, 255, 0.28)',
          }}
        />
      </View>
    </View>
  );
}

export function BeachVolleyballMark({ size }: { size: number }) {
  return (
    <Image
      source={beachBall}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
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
  if (template.id.startsWith('beach_volleyball')) {
    return <BeachVolleyballMark size={size + 4} />;
  }
  if (template.id === 'checkers') {
    return <CheckerGlyph size={size} />;
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
