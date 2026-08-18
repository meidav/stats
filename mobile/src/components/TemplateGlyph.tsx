import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { iconForTemplate } from '../lib/templateIcons';
import type { SportTemplate } from '../types';

type GlyphTemplate = Pick<SportTemplate, 'id' | 'category'>;

const beachBall = require('../../assets/beach-volleyball.png');

const FAN = [
  { rank: 'A', suit: 'S', rotate: '-18deg', top: 6, left: 0, z: 5 },
  { rank: 'K', suit: 'H', rotate: '-9deg', top: 3, left: 7, z: 4 },
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
                elevation: card.z,
                width: 16 * scale,
                height: 22 * scale,
                borderRadius: 3 * scale,
                transform: [{ rotate: card.rotate }],
              },
            ]}
          >
            <Text style={[styles.rank, { color: suit.color, fontSize: 6 * scale, lineHeight: 7 * scale }]}>
              {card.rank}
            </Text>
            <Text style={[styles.suit, { color: suit.color, fontSize: 7 * scale, lineHeight: 8 * scale }]}>
              {suit.mark}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function CheckerGlyph({ size }: { size: number }) {
  const disc = size * 0.72;
  const groove = disc * 0.58;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: disc,
          height: disc,
          borderRadius: disc / 2,
          backgroundColor: '#1C1917',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: '#0C0A09',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: groove,
            height: groove,
            borderRadius: groove / 2,
            borderWidth: Math.max(1.5, disc * 0.09),
            borderColor: 'rgba(255, 255, 255, 0.2)',
          }}
        />
      </View>
    </View>
  );
}

export function ChessKingGlyph({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text
        style={{
          fontSize: size * 1.28,
          lineHeight: size * 1.28,
          color: '#0F172A',
          textAlign: 'center',
          includeFontPadding: false,
        }}
      >
        {'\u265A'}
      </Text>
    </View>
  );
}

export function CustomGlyph({ size }: { size: number }) {
  const stroke = Math.max(2, size * 0.14);
  const arm = size * 0.42;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        backgroundColor: 'rgba(37, 99, 235, 0.16)',
        borderWidth: 1.5,
        borderColor: 'rgba(37, 99, 235, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: arm,
          height: stroke,
          borderRadius: 1,
          backgroundColor: '#2563EB',
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: stroke,
          height: arm,
          borderRadius: 1,
          backgroundColor: '#2563EB',
        }}
      />
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
  if (template.id.startsWith('beach_volleyball') || template.id === 'vollis') {
    return <BeachVolleyballMark size={size + 4} />;
  }
  if (template.id === 'checkers') {
    return <CheckerGlyph size={size} />;
  }
  if (template.id === 'chess') {
    return <ChessKingGlyph size={size} />;
  }
  if (template.id === 'custom') {
    return <CustomGlyph size={size} />;
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size, lineHeight: size + 2, includeFontPadding: false }}>
        {iconForTemplate(template)}
      </Text>
    </View>
  );
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
  },
  suit: {
    marginTop: -1,
  },
});

